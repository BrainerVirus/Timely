import { describe, expect, it } from "vitest";
import { getWorkflowColumnId, groupIssuesByWorkflow } from "@/features/issues/ui/AssignedIssuesBoard/lib/workflow-column";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

function issue(partial: Partial<AssignedIssueSnapshot> & Pick<AssignedIssueSnapshot, "key">): AssignedIssueSnapshot {
  return {
    title: "T",
    state: "opened",
    issueGraphqlId: "gid://gitlab/Issue/1",
    labels: [],
    ...partial,
  };
}

describe("getWorkflowColumnId", () => {
  it("returns closed for closed state", () => {
    expect(getWorkflowColumnId(issue({ key: "a", state: "closed" }))).toBe("closed");
  });

  it("maps todo-like labels", () => {
    expect(getWorkflowColumnId(issue({ key: "a", labels: ["To Do"] }))).toBe("todo");
  });

  it("maps doing-like labels", () => {
    expect(getWorkflowColumnId(issue({ key: "a", labels: ["In Progress"] }))).toBe("doing");
  });

  it("maps done-like labels", () => {
    expect(getWorkflowColumnId(issue({ key: "a", labels: ["Done"] }))).toBe("done");
  });

  it("returns other when no match", () => {
    expect(getWorkflowColumnId(issue({ key: "a", labels: ["random"] }))).toBe("other");
  });
});

describe("groupIssuesByWorkflow", () => {
  it("partitions issues", () => {
    const map = groupIssuesByWorkflow([
      issue({ key: "a", labels: ["To Do"] }),
      issue({ key: "b", labels: ["Done"] }),
    ]);
    expect(map.get("todo")).toHaveLength(1);
    expect(map.get("done")).toHaveLength(1);
  });
});
