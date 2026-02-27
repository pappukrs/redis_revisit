import { useState } from "react";
import CacheMonitor from "./CacheMonitor";

export default function Sidebar({ invalidationLog }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside className={`app-sidebar ${isCollapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                {!isCollapsed && <span className="sidebar-title">Analytics</span>}
                <button
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? "→" : "←"}
                </button>
            </div>

            <div className="sidebar-content">
                <CacheMonitor invalidationLog={invalidationLog} isCollapsed={isCollapsed} />
            </div>
        </aside>
    );
}
