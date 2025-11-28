import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

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

interface AssignmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (assignment: Omit<Assignment, "id">) => void;
  assignment?: Assignment | null;
  rankPlanId?: string;
}

export function AssignmentFormModal({
  open,
  onOpenChange,
  onSave,
  assignment,
  rankPlanId: initialRankPlanId,
}: AssignmentFormModalProps) {
  const [name, setName] = useState(assignment?.name || "");
  const [type, setType] = useState<"main" | "reliever">(
    assignment?.type || "main"
  );
  const [planStartDate, setPlanStartDate] = useState(
    assignment?.planStartDate
      ? format(assignment.planStartDate, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [planEndDate, setPlanEndDate] = useState(
    assignment?.planEndDate
      ? format(assignment.planEndDate, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [actualStartDate, setActualStartDate] = useState(
    assignment?.actualStartDate
      ? format(assignment.actualStartDate, "yyyy-MM-dd")
      : ""
  );
  const [actualEndDate, setActualEndDate] = useState(
    assignment?.actualEndDate
      ? format(assignment.actualEndDate, "yyyy-MM-dd")
      : ""
  );
  const [rankPlanId, setRankPlanId] = useState(
    assignment?.rankPlanId || initialRankPlanId || ""
  );

  useEffect(() => {
    if (assignment) {
      setName(assignment.name || "");
      setType(assignment.type);
      setPlanStartDate(format(assignment.planStartDate, "yyyy-MM-dd"));
      setPlanEndDate(format(assignment.planEndDate, "yyyy-MM-dd"));
      setActualStartDate(
        assignment.actualStartDate
          ? format(assignment.actualStartDate, "yyyy-MM-dd")
          : ""
      );
      setActualEndDate(
        assignment.actualEndDate
          ? format(assignment.actualEndDate, "yyyy-MM-dd")
          : ""
      );
      setRankPlanId(assignment.rankPlanId);
    } else if (initialRankPlanId) {
      setRankPlanId(initialRankPlanId);
    }
  }, [assignment, initialRankPlanId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (planStartDate && planEndDate && rankPlanId) {
      onSave({
        name: name.trim() || undefined,
        type,
        planStartDate: new Date(planStartDate),
        planEndDate: new Date(planEndDate),
        actualStartDate: actualStartDate
          ? new Date(actualStartDate)
          : undefined,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : undefined,
        rankPlanId,
      });
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (assignment) {
        setName(assignment.name || "");
        setType(assignment.type);
        setPlanStartDate(format(assignment.planStartDate, "yyyy-MM-dd"));
        setPlanEndDate(format(assignment.planEndDate, "yyyy-MM-dd"));
        setActualStartDate(
          assignment.actualStartDate
            ? format(assignment.actualStartDate, "yyyy-MM-dd")
            : ""
        );
        setActualEndDate(
          assignment.actualEndDate
            ? format(assignment.actualEndDate, "yyyy-MM-dd")
            : ""
        );
        setRankPlanId(assignment.rankPlanId);
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {assignment ? "Edit Assignment" : "Create Assignment"}
          </DialogTitle>
          <DialogDescription>
            {assignment
              ? "Update the assignment information."
              : "Add a new assignment to the rank plan."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter assignment name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "main" | "reliever")} required>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="reliever">Reliever</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="planStartDate">Plan Start Date</Label>
              <Input
                id="planStartDate"
                type="date"
                value={planStartDate}
                onChange={(e) => setPlanStartDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="planEndDate">Plan End Date</Label>
              <Input
                id="planEndDate"
                type="date"
                value={planEndDate}
                onChange={(e) => setPlanEndDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="actualStartDate">Actual Start Date (Optional)</Label>
              <Input
                id="actualStartDate"
                type="date"
                value={actualStartDate}
                onChange={(e) => setActualStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="actualEndDate">Actual End Date (Optional)</Label>
              <Input
                id="actualEndDate"
                type="date"
                value={actualEndDate}
                onChange={(e) => setActualEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

