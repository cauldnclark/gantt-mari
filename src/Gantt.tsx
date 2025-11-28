"use client";
import {
  GanttCreateMarkerTrigger,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureRow,
  GanttHeader,
  GanttMarker,
  GanttProvider,
  GanttSidebar,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
} from "@/components/ui/shadcn-io/gantt";
import { groupBy } from "lodash";
import { EditIcon, PlusIcon, TrashIcon, EraserIcon } from "lucide-react";
import { useState, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type {
  GanttFeature,
  GanttStatus,
} from "@/components/ui/shadcn-io/gantt";
import { Button } from "@/components/ui/button";
import { RankFormModal } from "@/components/RankFormModal";
import { RankPlanFormModal } from "@/components/RankPlanFormModal";
import { AssignmentFormModal } from "@/components/AssignmentFormModal";
import { format } from "date-fns";

interface Rank {
  id: string;
  name: string;
}

interface RankPlan {
  id: string;
  name: string;
  rankId: string;
}

interface Assignment {
  id: string;
  name?: string;
  type: "main" | "reliever";
  planStartDate: Date;
  planEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  rankPlanId: string;
}

interface GanttProps {
  ranks?: Rank[];
  rankPlans?: RankPlan[];
  assignments?: Assignment[];
  markers?: Array<{
    id: string;
    date: Date;
    label: string;
    className?: string;
  }>;
}

// Helper functions for localStorage with date handling
const serializeForStorage = (data: unknown): string => {
  return JSON.stringify(data, (_key, value) => {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    return value;
  });
};

const deserializeFromStorage = <T,>(json: string): T => {
  const parsed = JSON.parse(json);

  // Recursively convert Date objects
  const convertDates = (obj: unknown): unknown => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Check if it's a Date marker object
    if (
      typeof obj === "object" &&
      obj !== null &&
      "__type" in obj &&
      obj.__type === "Date" &&
      "value" in obj
    ) {
      return new Date(String(obj.value));
    }

    // If it's an array, convert each element
    if (Array.isArray(obj)) {
      return obj.map(convertDates);
    }

    // If it's an object, convert all properties
    if (typeof obj === "object") {
      const converted: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = convertDates(value);
      }
      return converted;
    }

    return obj;
  };

  return convertDates(parsed) as T;
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return deserializeFromStorage<T>(stored);
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  return defaultValue;
};

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, serializeForStorage(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

const Gantt = ({
  ranks: initialRanks = [],
  rankPlans: initialRankPlans = [],
  assignments: initialAssignments = [],
  markers: initialMarkers = [],
}: GanttProps = {}) => {
  // Load from localStorage on mount, fallback to props/defaults
  const [ranks, setRanks] = useState<Rank[]>(() => {
    const stored = loadFromStorage<Rank[]>("gantt-ranks", initialRanks);
    return stored.length > 0 ? stored : initialRanks;
  });
  const [rankPlans, setRankPlans] = useState<RankPlan[]>(() => {
    const stored = loadFromStorage<RankPlan[]>(
      "gantt-rankPlans",
      initialRankPlans
    );
    return stored.length > 0 ? stored : initialRankPlans;
  });
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const stored = loadFromStorage<Assignment[]>(
      "gantt-assignments",
      initialAssignments
    );
    if (stored.length > 0) {
      // Ensure all dates are properly converted to Date objects
      return stored.map((assignment) => ({
        ...assignment,
        planStartDate:
          assignment.planStartDate instanceof Date
            ? assignment.planStartDate
            : new Date(assignment.planStartDate),
        planEndDate:
          assignment.planEndDate instanceof Date
            ? assignment.planEndDate
            : new Date(assignment.planEndDate),
        actualStartDate: assignment.actualStartDate
          ? assignment.actualStartDate instanceof Date
            ? assignment.actualStartDate
            : new Date(assignment.actualStartDate)
          : undefined,
        actualEndDate: assignment.actualEndDate
          ? assignment.actualEndDate instanceof Date
            ? assignment.actualEndDate
            : new Date(assignment.actualEndDate)
          : undefined,
      }));
    }
    return initialAssignments;
  });
  const [markers, setMarkers] = useState(() => {
    const stored = loadFromStorage<
      Array<{ id: string; date: Date; label: string; className?: string }>
    >("gantt-markers", initialMarkers);
    if (stored.length > 0) {
      // Ensure all dates are properly converted to Date objects
      return stored.map((marker) => ({
        ...marker,
        date: marker.date instanceof Date ? marker.date : new Date(marker.date),
      }));
    }
    return initialMarkers;
  });

  // Modal states
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [rankPlanModalOpen, setRankPlanModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [editingRankPlan, setEditingRankPlan] = useState<RankPlan | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null
  );
  const [selectedRankForPlan, setSelectedRankForPlan] = useState<string | null>(
    null
  );
  const [selectedRankPlanForAssignment, setSelectedRankPlanForAssignment] =
    useState<string | null>(null);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveToStorage("gantt-ranks", ranks);
  }, [ranks]);

  useEffect(() => {
    saveToStorage("gantt-rankPlans", rankPlans);
  }, [rankPlans]);

  useEffect(() => {
    saveToStorage("gantt-assignments", assignments);
  }, [assignments]);

  useEffect(() => {
    saveToStorage("gantt-markers", markers);
  }, [markers]);

  // Status colors for assignment types
  const getAssignmentStatus = (type: "main" | "reliever"): GanttStatus => {
    return type === "main"
      ? { id: "main", name: "Main", color: "#3B82F6" } // Blue
      : { id: "reliever", name: "Reliever", color: "#10B981" }; // Green
  };

  // Convert Assignment to GanttFeature
  const assignmentToFeature = (assignment: Assignment): GanttFeature => {
    return {
      id: assignment.id,
      name: assignment.name || "Unassigned",
      startAt: assignment.planStartDate,
      endAt: assignment.planEndDate,
      status: getAssignmentStatus(assignment.type),
    };
  };

  // Group rankPlans by rank
  const rankPlansByRank = groupBy(rankPlans, "rankId");
  // Group assignments by rankPlan
  const assignmentsByRankPlan = groupBy(assignments, "rankPlanId");

  const handleRemoveMarker = (id: string) => {
    setMarkers((prev) => prev.filter((marker) => marker.id !== id));
    console.log(`Remove marker: ${id}`);
  };
  const handleCreateMarker = (date: Date) => {
    const newMarker = {
      id: crypto.randomUUID(),
      date,
      label: "New Marker",
      className: "bg-blue-100 text-blue-900",
    };
    setMarkers((prev) => [...prev, newMarker]);
    console.log(`Create marker: ${date.toISOString()}`);
  };
  const handleMoveAssignment = (
    id: string,
    startAt: Date,
    endAt: Date | null
  ) => {
    if (!endAt) {
      return;
    }
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === id
          ? { ...assignment, planStartDate: startAt, planEndDate: endAt }
          : assignment
      )
    );
    console.log(`Move assignment: ${id} from ${startAt} to ${endAt}`);
  };

  // Rank handlers
  const handleCreateRank = () => {
    setEditingRank(null);
    setRankModalOpen(true);
  };
  const handleSaveRank = (rankData: Omit<Rank, "id">) => {
    if (editingRank) {
      setRanks((prev) =>
        prev.map((r) => (r.id === editingRank.id ? { ...r, ...rankData } : r))
      );
    } else {
      const newRank: Rank = {
        id: crypto.randomUUID(),
        ...rankData,
      };
      setRanks((prev) => [...prev, newRank]);
    }
    setRankModalOpen(false);
    setEditingRank(null);
  };

  // RankPlan handlers
  const handleCreateRankPlan = (rankId?: string) => {
    setEditingRankPlan(null);
    setSelectedRankForPlan(rankId || null);
    setRankPlanModalOpen(true);
  };
  const handleSaveRankPlan = (rankPlanData: Omit<RankPlan, "id">) => {
    if (editingRankPlan) {
      setRankPlans((prev) =>
        prev.map((rp) =>
          rp.id === editingRankPlan.id ? { ...rp, ...rankPlanData } : rp
        )
      );
    } else {
      const newRankPlan: RankPlan = {
        id: crypto.randomUUID(),
        ...rankPlanData,
      };
      setRankPlans((prev) => [...prev, newRankPlan]);
    }
    setRankPlanModalOpen(false);
    setEditingRankPlan(null);
    setSelectedRankForPlan(null);
  };

  // Assignment handlers
  const handleCreateAssignment = (rankPlanId?: string) => {
    setEditingAssignment(null);
    setSelectedRankPlanForAssignment(rankPlanId || null);
    setAssignmentModalOpen(true);
  };
  const handleSaveAssignment = (assignmentData: Omit<Assignment, "id">) => {
    if (editingAssignment) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingAssignment.id ? { ...a, ...assignmentData } : a
        )
      );
    } else {
      const newAssignment: Assignment = {
        id: crypto.randomUUID(),
        ...assignmentData,
      };
      setAssignments((prev) => [...prev, newAssignment]);
    }
    setAssignmentModalOpen(false);
    setEditingAssignment(null);
    setSelectedRankPlanForAssignment(null);
  };
  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentModalOpen(true);
  };
  const handleDeleteAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClearStorage = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This action cannot be undone."
      )
    ) {
      localStorage.removeItem("gantt-ranks");
      localStorage.removeItem("gantt-rankPlans");
      localStorage.removeItem("gantt-assignments");
      localStorage.removeItem("gantt-markers");
      setRanks([]);
      setRankPlans([]);
      setAssignments([]);
      setMarkers([]);
    }
  };

  return (
    <>
      <style>{`
        .gantt {
          overflow-x: auto !important;
          overflow-y: auto !important;
        }
        .gantt::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }
        .gantt::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .gantt::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 6px;
        }
        .gantt::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        [data-roadmap-ui="gantt-sidebar"] > div:first-child {
          display: none;
        }
        [data-roadmap-ui="gantt-sidebar"] {
          height: 100vh !important;
          max-height: 100vh !important;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        [data-roadmap-ui="gantt-sidebar"] > div:last-child {
          display: flex;
          flex-direction: column;
          flex: 1 1 0;
          min-height: 0;
          max-height: 100%;
          overflow: hidden;
        }
        [data-assignment-type="reliever"] {
          position: relative;
        }
        [data-assignment-type="reliever"] [data-slot="card"] {
          border: 1px solid #10B981 !important;
          background-color: #F0FDF4 !important;
        }
        [data-assignment-type="main"] [data-slot="card"] {
          border: 1px solid #3B82F6 !important;
          background-color: #FFFFFF !important;
        }
        [data-assignment-type] [data-slot="card"] {
          background-color: #FFFFFF !important;
        }
        [data-assignment-type="reliever"] {
          background-color: #F0FDF4 !important;
        }
        [data-assignment-type="reliever"] > * {
          background-color: #F0FDF4 !important;
        }
        [data-assignment-type="reliever"] [data-slot="card"] * {
          background-color: #F0FDF4 !important;
        }
        [data-assignment-type="reliever"] [data-slot="card"] > div {
          background-color: #F0FDF4 !important;
        }
        [data-assignment-type] {
          padding: 0 !important;
          margin: 0 !important;
        }
        [data-assignment-type] * {
          padding: 0 !important;
        }
        [data-assignment-type] [data-slot="card"] {
          padding: 0 !important;
          margin: 0 !important;
        }
        [data-assignment-type] [data-slot="card"].p-2 {
          padding: 0 !important;
        }
        [data-assignment-type] div[class*="p-2"] {
          padding: 0 !important;
        }
        [data-assignment-type] div[class*="p-"] {
          padding: 0 !important;
        }
        [data-assignment-type] [data-slot="card"].p-2,
        [data-assignment-type] [data-slot="card"][class*="p-"],
        [data-assignment-type] .p-2,
        [data-assignment-type] [class*="p-2"],
        [data-assignment-type] [class*="p-"] {
          padding: 0 !important;
          padding-top: 0 !important;
          padding-right: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
        }
        [data-assignment-type] [data-slot="card"] > div {
          padding: 0 !important;
          margin: 0 !important;
          gap: 0 !important;
        }
        [data-assignment-type] [data-slot="card"] > div > * {
          padding: 0 !important;
          margin: 0 !important;
        }
        [data-assignment-type] p {
          padding: 0 !important;
          margin: 0 !important;
          color: #000000 !important;
          font-weight: 500 !important;
          z-index: 1 !important;
          position: relative !important;
          background: transparent !important;
          text-shadow: 0 0 2px rgba(255,255,255,0.8) !important;
        }
        [data-assignment-type] > * {
          padding: 0 !important;
          margin: 0 !important;
          z-index: 1 !important;
          position: relative !important;
          background: transparent !important;
        }
        [data-assignment-type] [data-slot="card"] {
          z-index: 1 !important;
          position: relative !important;
        }
        [data-roadmap-ui="gantt-sidebar"] {
          z-index: 40 !important;
          position: sticky !important;
          left: 0 !important;
          top: 0 !important;
        }
        [data-radix-dialog-overlay],
        [data-radix-dialog-content] {
          z-index: 100 !important;
        }
        [data-assignment-type] [data-slot="card"] > div {
          background: transparent !important;
        }
        [data-assignment-type] * {
          padding: 0 !important;
          margin: 0 !important;
        }
        [data-assignment-type] [data-slot="card"],
        [data-assignment-type] [data-slot="card"].p-2,
        [data-assignment-type] div[data-slot="card"],
        [data-assignment-type] div[data-slot="card"].p-2,
        [data-assignment-type] div[class*="p-2"][data-slot="card"],
        [data-assignment-type] div[class*="p-"][data-slot="card"] {
          padding: 0 !important;
          padding-top: 0 !important;
          padding-right: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
          margin: 0 !important;
        }
        [data-assignment-type] [data-slot="card"] *,
        [data-assignment-type] [data-slot="card"] > *,
        [data-assignment-type] [data-slot="card"] > div,
        [data-assignment-type] [data-slot="card"] > div > *,
        [data-assignment-type] [data-slot="card"] > div > div {
          padding: 0 !important;
          padding-top: 0 !important;
          padding-right: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
        }
        div[data-slot="card"].p-2,
        div[data-slot="card"][class*="p-2"],
        [data-assignment-type] div[class*="p-"],
        [data-assignment-type] div[class*="p-2"],
        [data-assignment-type] .p-2,
        [data-assignment-type] [class*="p-2"],
        [data-assignment-type] [class*="p-"],
        [data-assignment-type] [class*="p-2"][data-slot="card"],
        [data-assignment-type] [class*="p-"][data-slot="card"],
        [data-assignment-type] [data-slot="card"][class*="p-2"],
        [data-assignment-type] [data-slot="card"][class*="p-"] {
          padding: 0 !important;
          padding-top: 0 !important;
          padding-right: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
        }
        [data-assignment-type] [data-slot="card"],
        [data-assignment-type] [data-slot="card"].p-2,
        [data-assignment-type] div[data-slot="card"],
        [data-assignment-type] div[data-slot="card"].p-2 {
          padding: 0 !important;
          padding-top: 0 !important;
          padding-right: 0 !important;
          padding-bottom: 0 !important;
          padding-left: 0 !important;
        }
      `}</style>
      <GanttProvider className="border h-screen" range="monthly" zoom={100}>
        <GanttSidebar>
          <div
            className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2.5 border-border/50 border-b bg-backdrop/90 p-2.5 font-medium text-muted-foreground text-xs backdrop-blur-sm"
            style={{ height: "var(--gantt-header-height)" }}
          >
            <p className="flex-1 truncate text-left">Rank</p>
            <Button
              onClick={handleCreateRank}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 shrink-0"
              title="Create Rank"
            >
              <PlusIcon className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-col flex-1 min-h-0 max-h-full overflow-hidden">
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{
                minHeight: 0,
                maxHeight: "calc(100vh - var(--gantt-header-height) - 60px)",
              }}
            >
              {ranks.map((rank) => {
                const rankPlanList = rankPlansByRank[rank.id] || [];
                return (
                  <div key={rank.id}>
                    <div
                      className="w-full flex items-center justify-between gap-2 p-2.5 text-left font-medium text-muted-foreground text-xs"
                      style={{ height: "var(--gantt-row-height)" }}
                    >
                      <p className="flex-1 truncate">{rank.name}</p>
                      <Button
                        onClick={() => handleCreateRankPlan(rank.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0"
                        title="Add Rank Plan"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="divide-y divide-border/50">
                      {rankPlanList.map((rankPlan) => {
                        const planAssignments =
                          assignmentsByRankPlan[rankPlan.id] || [];
                        // Create a representative feature for the sidebar
                        const today = new Date();
                        const representativeFeature: GanttFeature = {
                          id: rankPlan.id,
                          name: rankPlan.name,
                          startAt:
                            planAssignments.length > 0
                              ? new Date(
                                  Math.min(
                                    ...planAssignments.map((a) =>
                                      a.planStartDate.getTime()
                                    )
                                  )
                                )
                              : today,
                          endAt:
                            planAssignments.length > 0
                              ? new Date(
                                  Math.max(
                                    ...planAssignments.map((a) =>
                                      a.planEndDate.getTime()
                                    )
                                  )
                                )
                              : today,
                          status: {
                            id: "default",
                            name: "Default",
                            color: "#6B7280",
                          },
                        };

                        return (
                          <div
                            key={rankPlan.id}
                            className="relative flex items-center gap-2"
                          >
                            <GanttSidebarItem feature={representativeFeature} />
                            <Button
                              onClick={() =>
                                handleCreateAssignment(rankPlan.id)
                              }
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 shrink-0 mr-2"
                              title="Add Assignment"
                            >
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t shrink-0">
              <Button
                onClick={handleClearStorage}
                size="sm"
                className="w-full"
                variant="destructive"
              >
                <EraserIcon className="h-4 w-4 mr-2" />
                Clear Storage
              </Button>
            </div>
          </div>
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            {ranks.map((rank) => {
              const rankPlanList = rankPlansByRank[rank.id] || [];
              return (
                <GanttFeatureListGroup key={rank.id}>
                  <div
                    className="w-full flex items-center justify-between gap-2 px-2.5 text-left font-medium text-muted-foreground text-xs"
                    style={{
                      height: "var(--gantt-row-height)",
                      marginTop: "calc(-1 * var(--gantt-row-height) + 8px)",
                    }}
                  >
                    <p className="flex-1 truncate">{rank.name}</p>
                  </div>
                  {rankPlanList.map((rankPlan) => {
                    const planAssignments =
                      assignmentsByRankPlan[rankPlan.id] || [];
                    const features = planAssignments.map(assignmentToFeature);

                    return (
                      <GanttFeatureRow
                        key={rankPlan.id}
                        features={features}
                        onMove={handleMoveAssignment}
                      >
                        {(feature) => {
                          const assignment = planAssignments.find(
                            (a) => a.id === feature.id
                          );
                          if (!assignment) return null;

                          return (
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <div
                                  className="flex flex-col items-center justify-center h-full w-full cursor-pointer"
                                  style={{ padding: 0, margin: 0 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditAssignment(assignment);
                                  }}
                                  data-assignment-type={assignment.type}
                                >
                                  <p
                                    style={{
                                      padding: 0,
                                      margin: 0,
                                      color: "#000000",
                                      fontWeight: 500,
                                      fontSize: "12px",
                                      zIndex: 1,
                                      position: "relative",
                                      backgroundColor: "transparent",
                                      textShadow:
                                        "0 0 2px rgba(255,255,255,0.8)",
                                    }}
                                  >
                                    {assignment.type === "reliever"
                                      ? `${
                                          assignment.name || "Unassigned"
                                        } (reliever)`
                                      : assignment.name || "Unassigned"}
                                  </p>
                                  <p
                                    style={{
                                      padding: 0,
                                      margin: "2px 0 0 0",
                                      color: "#000000",
                                      fontWeight: 400,
                                      fontSize: "10px",
                                      zIndex: 1,
                                      position: "relative",
                                      backgroundColor: "transparent",
                                      textShadow:
                                        "0 0 2px rgba(255,255,255,0.8)",
                                    }}
                                  >
                                    {format(assignment.planStartDate, "MMM dd")}{" "}
                                    - {format(assignment.planEndDate, "MMM dd")}
                                  </p>
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                <ContextMenuItem
                                  className="flex items-center gap-2"
                                  onClick={() =>
                                    handleEditAssignment(assignment)
                                  }
                                >
                                  <EditIcon
                                    className="text-muted-foreground"
                                    size={16}
                                  />
                                  Edit assignment
                                </ContextMenuItem>
                                <ContextMenuItem
                                  className="flex items-center gap-2 text-destructive"
                                  onClick={() =>
                                    handleDeleteAssignment(assignment.id)
                                  }
                                >
                                  <TrashIcon size={16} />
                                  Delete assignment
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          );
                        }}
                      </GanttFeatureRow>
                    );
                  })}
                </GanttFeatureListGroup>
              );
            })}
          </GanttFeatureList>
          {markers.map((marker) => (
            <GanttMarker
              key={marker.id}
              {...marker}
              onRemove={handleRemoveMarker}
            />
          ))}
          <GanttToday />
          <GanttCreateMarkerTrigger onCreateMarker={handleCreateMarker} />
        </GanttTimeline>
      </GanttProvider>

      <RankFormModal
        open={rankModalOpen}
        onOpenChange={(open) => {
          setRankModalOpen(open);
          if (!open) setEditingRank(null);
        }}
        onSave={handleSaveRank}
        rank={editingRank}
      />

      <RankPlanFormModal
        open={rankPlanModalOpen}
        onOpenChange={(open) => {
          setRankPlanModalOpen(open);
          if (!open) {
            setEditingRankPlan(null);
            setSelectedRankForPlan(null);
          }
        }}
        onSave={handleSaveRankPlan}
        rankPlan={editingRankPlan}
        ranks={ranks}
        defaultRankId={selectedRankForPlan}
      />

      <AssignmentFormModal
        open={assignmentModalOpen}
        onOpenChange={(open) => {
          setAssignmentModalOpen(open);
          if (!open) {
            setEditingAssignment(null);
            setSelectedRankPlanForAssignment(null);
          }
        }}
        onSave={handleSaveAssignment}
        assignment={editingAssignment}
        rankPlanId={selectedRankPlanForAssignment || undefined}
      />
    </>
  );
};
export default Gantt;
