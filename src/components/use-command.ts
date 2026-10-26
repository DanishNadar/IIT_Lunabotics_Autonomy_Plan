"use client";

import { useCallback, useTransition } from "react";
import { runCommand, type CommandResult } from "@/app/actions/command";
import type { Command } from "@/lib/domain/commands";
import { useToast } from "./ui/toast";

/**
 * Runs a server command with toasts. Pass `onError` to roll back optimistic UI.
 * The server action revalidates, so the page refreshes with authoritative data.
 */
export function useCommand() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = useCallback(
    (cmd: Command, opts: { quiet?: boolean; onSuccess?: (r: Extract<CommandResult, { ok: true }>) => void; onError?: (msg: string) => void } = {}) =>
      new Promise<CommandResult>((resolve) => {
        start(async () => {
          let res: CommandResult;
          try {
            res = await runCommand(cmd);
          } catch {
            res = { ok: false, error: "Network error — change not saved." };
          }
          if (res.ok) {
            if (!opts.quiet && res.message) toast("ok", res.message);
            opts.onSuccess?.(res);
          } else {
            toast("error", res.error);
            opts.onError?.(res.error);
          }
          resolve(res);
        });
      }),
    [toast],
  );
  return { run, pending };
}
