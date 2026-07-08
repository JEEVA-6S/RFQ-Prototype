import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WorkflowProvider } from "@/context/WorkflowContext";

export function AppShell() {
    return (
        <WorkflowProvider>
            <div className="flex h-screen w-full overflow-hidden bg-background">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <TopBar />
                    <main className="scrollbar-thin flex-1 overflow-y-auto bg-background">
                        <div className="page-enter">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </WorkflowProvider>
    );
}
