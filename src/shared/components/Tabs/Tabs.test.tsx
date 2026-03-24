import * as TabsPrimitive from "@radix-ui/react-tabs";
import { render, screen } from "@testing-library/react";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/Tabs/Tabs";

describe("Tabs", () => {
  it("renders tabs and content", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsPrimitive.Content value="a">Content A</TabsPrimitive.Content>
        <TabsPrimitive.Content value="b">Content B</TabsPrimitive.Content>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "Tab A" })).toBeInTheDocument();
    expect(screen.getByText("Content A")).toBeInTheDocument();
  });

  it("switches content when tab is selected", () => {
    render(
      <Tabs defaultValue="b">
        <TabsList>
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsPrimitive.Content value="a">A</TabsPrimitive.Content>
        <TabsPrimitive.Content value="b">B</TabsPrimitive.Content>
      </Tabs>,
    );
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
