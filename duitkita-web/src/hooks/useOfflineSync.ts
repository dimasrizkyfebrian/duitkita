"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getOutbox, removeFromOutbox, type OutboxItem } from "@/lib/outbox";
import { isApiError } from "@/lib/api-envelope";
import { createExpense } from "@/lib/services/expense.service";
import { createReminder } from "@/lib/services/reminder.service";
import type { CreateExpenseRequest, CreateReminderRequest } from "@/types";

async function replayItem(item: OutboxItem): Promise<void> {
  if (item.type === "CREATE_EXPENSE") {
    await createExpense(item.payload as unknown as CreateExpenseRequest);
  } else if (item.type === "CREATE_REMINDER") {
    await createReminder(item.payload as unknown as CreateReminderRequest);
  }
}

export function useOfflineSync() {
  const qc = useQueryClient();

  useEffect(() => {
    async function replayOutbox() {
      const items = await getOutbox();
      if (items.length === 0) return;

      toast.info(`Menyinkronkan ${items.length} item...`);
      let success = 0;
      let failed = 0;

      for (const item of items) {
        try {
          await replayItem(item);
          await removeFromOutbox(item.id);
          success++;
        } catch (err) {
          if (isApiError(err) && (err.status === 409 || err.status === 412)) {
            await removeFromOutbox(item.id);
            toast.warning(`Item konflik dibuang: ${err.message}`);
          } else {
            failed++;
          }
        }
      }

      if (success > 0) {
        qc.invalidateQueries({ queryKey: ["expenses"] });
        qc.invalidateQueries({ queryKey: ["reminders"] });
        qc.invalidateQueries({ queryKey: ["activity"] });
        qc.invalidateQueries({ queryKey: ["budgets"] });
        toast.success(`${success} item berhasil disinkronkan`);
      }
      if (failed > 0) {
        toast.error(`${failed} item gagal disinkronkan — akan dicoba lagi saat online`);
      }
    }

    window.addEventListener("online", replayOutbox);
    return () => window.removeEventListener("online", replayOutbox);
  }, [qc]);
}
