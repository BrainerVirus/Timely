import type { IssueDetailsSnapshot } from "@/shared/types/dashboard";

export type IssueComposerMode = "write" | "preview" | "split";

export type IssueDetailsLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; details: IssueDetailsSnapshot };
