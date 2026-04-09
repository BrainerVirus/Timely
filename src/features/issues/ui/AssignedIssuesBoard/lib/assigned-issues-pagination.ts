export interface AssignedIssuesPaginationPageItem {
  type: "page";
  page: number;
}

export interface AssignedIssuesPaginationEllipsisItem {
  type: "ellipsis";
  key: string;
  targetPage: number;
}

export type AssignedIssuesPaginationItem =
  | AssignedIssuesPaginationPageItem
  | AssignedIssuesPaginationEllipsisItem;

const EDGE_CHUNK_SIZE = 3;
const PAGE_CHUNK_SIZE = 3;

function collectPageAnchors(currentPage: number, totalPages: number) {
  const pages = new Set<number>();
  const firstChunkEnd = Math.min(EDGE_CHUNK_SIZE, totalPages);
  const lastChunkStart = Math.max(1, totalPages - EDGE_CHUNK_SIZE + 1);
  const currentChunkStart = Math.floor((currentPage - 1) / PAGE_CHUNK_SIZE) * PAGE_CHUNK_SIZE + 1;
  const currentChunkEnd = Math.min(totalPages, currentChunkStart + PAGE_CHUNK_SIZE - 1);

  for (let page = 1; page <= firstChunkEnd; page += 1) {
    pages.add(page);
  }

  for (let page = currentChunkStart; page <= currentChunkEnd; page += 1) {
    pages.add(page);
  }

  for (let page = lastChunkStart; page <= totalPages; page += 1) {
    pages.add(page);
  }

  return [...pages].sort((left, right) => left - right);
}

export function buildAssignedIssuesPagination(
  currentPage: number,
  totalPages: number,
): AssignedIssuesPaginationItem[] {
  if (totalPages <= 1) {
    return [{ type: "page", page: 1 }];
  }

  const anchors = collectPageAnchors(currentPage, totalPages);
  const items: AssignedIssuesPaginationItem[] = [];

  for (const page of anchors) {
    const previousItem = items[items.length - 1];

    if (previousItem?.type === "page") {
      const gap = page - previousItem.page;

      if (gap === 2) {
        items.push({
          type: "page",
          page: previousItem.page + 1,
        });
      } else if (gap > 2) {
        items.push({
          type: "ellipsis",
          key: `ellipsis-${previousItem.page}-${page}`,
          targetPage: Math.min(totalPages, previousItem.page + PAGE_CHUNK_SIZE),
        });
      }
    }

    items.push({
      type: "page",
      page,
    });
  }

  return items;
}

export function getAssignedIssuesRange(page: number, pageSize: number, totalItems: number) {
  if (totalItems === 0) {
    return { start: 0, end: 0 };
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  return { start, end };
}
