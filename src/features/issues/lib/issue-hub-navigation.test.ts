import {
  popIssueHubHistory,
  pushIssueHubHistory,
} from "@/features/issues/lib/issue-hub-navigation";

import type { IssueRouteReference } from "@/shared/types/dashboard";

const issueA: IssueRouteReference = { provider: "gitlab", issueId: "group/project#1" };
const issueB: IssueRouteReference = { provider: "gitlab", issueId: "group/project#2" };
const issueC: IssueRouteReference = { provider: "gitlab", issueId: "group/project#3" };

describe("issue-hub-navigation", () => {
  it("pushes the current issue into history when opening a related issue", () => {
    expect(pushIssueHubHistory([], issueA, issueB)).toEqual([issueA]);
    expect(pushIssueHubHistory([issueA], issueB, issueC)).toEqual([issueA, issueB]);
  });

  it("pops back to the previous issue and leaves board fallback when history is empty", () => {
    expect(popIssueHubHistory([])).toEqual({
      previousIssue: null,
      remainingHistory: [],
    });

    expect(popIssueHubHistory([issueA, issueB])).toEqual({
      previousIssue: issueB,
      remainingHistory: [issueA],
    });
  });
});
