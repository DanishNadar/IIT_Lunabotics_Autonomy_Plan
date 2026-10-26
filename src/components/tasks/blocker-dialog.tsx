"use client";

import { useState } from "react";
import { Dialog } from "../ui/overlay";
import { Button, Textarea } from "../ui/primitives";
import { useCommand } from "../use-command";

export function BlockerDialog({ taskId, taskKey, open, onOpenChange, trigger }: { taskId: string; taskKey: string; open?: boolean; onOpenChange?: (o: boolean) => void; trigger?: React.ReactNode }) {
  const [text, setText] = useState("");
  const [inner, setInner] = useState(false);
  const { run, pending } = useCommand();
  const isOpen = open ?? inner;
  const setOpen = onOpenChange ?? setInner;
  return (
    <Dialog open={isOpen} onOpenChange={setOpen} trigger={trigger} title={`Raise a blocker on ${taskKey}`} description="Describe what is blocking progress and what would unblock it. Leads and assignees are notified.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run({ type: "task.block", taskId, description: text }, { onSuccess: () => { setText(""); setOpen(false); } });
        }}
        className="space-y-3"
      >
        <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Waiting on AG-04 topic contract for /imu/data frame_id" required minLength={5} />
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={pending}>
            Mark blocked
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
