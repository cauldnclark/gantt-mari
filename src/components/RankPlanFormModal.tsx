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

interface Rank {
  id: string;
  name: string;
}

interface RankPlan {
  id: string;
  name: string;
  rankId: string;
}

interface RankPlanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rankPlan: Omit<RankPlan, "id">) => void;
  rankPlan?: RankPlan | null;
  ranks: Rank[];
  defaultRankId?: string | null;
}

export function RankPlanFormModal({
  open,
  onOpenChange,
  onSave,
  rankPlan,
  ranks,
  defaultRankId,
}: RankPlanFormModalProps) {
  const [name, setName] = useState(rankPlan?.name || "");
  const [rankId, setRankId] = useState(rankPlan?.rankId || defaultRankId || "");

  useEffect(() => {
    if (rankPlan) {
      setName(rankPlan.name);
      setRankId(rankPlan.rankId);
    } else {
      setName("");
      setRankId(defaultRankId || "");
    }
  }, [rankPlan, defaultRankId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && rankId) {
      onSave({ name: name.trim(), rankId });
      setName("");
      setRankId("");
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName(rankPlan?.name || "");
      setRankId(rankPlan?.rankId || "");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {rankPlan ? "Edit Rank Plan" : "Create Rank Plan"}
          </DialogTitle>
          <DialogDescription>
            {rankPlan
              ? "Update the rank plan information."
              : "Add a new rank plan to the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rank">Rank</Label>
              <Select value={rankId} onValueChange={setRankId} required>
                <SelectTrigger id="rank">
                  <SelectValue placeholder="Select a rank" />
                </SelectTrigger>
                <SelectContent>
                  {ranks.map((rank) => (
                    <SelectItem key={rank.id} value={rank.id}>
                      {rank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter rank plan name"
                required
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

