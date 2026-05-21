import { SidebarNav } from "./SidebarNav";

export const Sidebar = () => {
  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-sidebar-border">
      <SidebarNav />
    </aside>
  );
};
