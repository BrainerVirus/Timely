import {
  getIssueRouteReference,
  matchesIssueRouteReference,
} from "@/features/issues/lib/issue-reference";

import type { AssignedIssueSnapshot } from "@/shared/types/dashboard";

const issue: AssignedIssueSnapshot = {
  provider: "gitlab",
  issueId: "group/project#42",
  providerIssueRef: "gid://gitlab/Issue/42",
  key: "group/project#42",
  title: "Fix the thing",
  state: "opened",
  workflowStatus: "doing",
  labels: ["workflow::doing"],
};

describe("issue-reference", () => {
  it("builds route search values from the provider-neutral issue identity", () => {
    expect(getIssueRouteReference(issue)).toEqual({
      provider: "gitlab",
      issueId: "group/project#42",
    });
  });

  it("matches route references without relying on provider-specific mutation ids", () => {
    expect(
      matchesIssueRouteReference(issue, {
        provider: "gitlab",
        issueId: "group/project#42",
      }),
    ).toBe(true);

    expect(
      matchesIssueRouteReference(issue, {
        provider: "gitlab",
        issueId: "group/project#999",
      }),
    ).toBe(false);
  });
});
