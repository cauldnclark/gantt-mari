import { useState } from "react";
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

interface Rank {
  id: string;
  name: string;
}

interface RankFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rank: Omit<Rank, "id">) => void;
  rank?: Rank | null;
}

export function RankFormModal({
  open,
  onOpenChange,
  onSave,
  rank,
}: RankFormModalProps) {
  const [name, setName] = useState(rank?.name || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({ name: name.trim() });
      setName("");
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName(rank?.name || "");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rank ? "Edit Rank" : "Create Rank"}</DialogTitle>
          <DialogDescription>
            {rank
              ? "Update the rank information."
              : "Add a new rank to the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter rank name"
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

