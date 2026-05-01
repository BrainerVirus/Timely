import {
  groupIssuesBySprint,
  sprintLabel,
} from "@/features/issues/ui/AssignedIssuesBoard/lib/group-issues-by-sprint";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

function issue(
  partial: Partial<AssignedIssueSnapshot> & Pick<AssignedIssueSnapshot, "key" | "title">,
): AssignedIssueSnapshot {
  return {
    provider: "gitlab",
    issueId: partial.key,
    providerIssueRef: "gid://gitlab/Issue/1",
    state: "opened",
    workflowStatus: "todo",
    labels: [],
    ...partial,
  };
}

describe("groupIssuesBySprint", () => {
  it("groups by iteration title first", () => {
    const issues = [
      issue({ key: "a#1", title: "A", iterationTitle: "Sprint 1" }),
      issue({ key: "a#2", title: "B", iterationTitle: "Sprint 2" }),
      issue({ key: "a#3", title: "C", iterationTitle: "Sprint 1" }),
    ];
    const map = groupIssuesBySprint(issues, "none");
    expect(map.get("Sprint 1")).toHaveLength(2);
    expect(map.get("Sprint 2")).toHaveLength(1);
  });

  it("falls back to milestone then default label", () => {
    expect(
      sprintLabel(
        issue({ key: "p#1", title: "x", milestoneTitle: "M1", iterationTitle: undefined }),
        "Z",
      ),
    ).toBe("M1");
    expect(sprintLabel(issue({ key: "p#2", title: "y" }), "Z")).toBe("Z");
  });
});
