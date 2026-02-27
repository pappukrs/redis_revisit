import { useState } from "react";
import CacheMonitor from "./CacheMonitor";

export default function Sidebar({ invalidationLog }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside className={`app-sidebar ${isCollapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                {!isCollapsed && <span className="sidebar-title">Management</span>}
                <button
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <span style={{
                        display: "inline-block",
                        transition: "transform 0.3s ease",
                        transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)"
                    }}>
                        ⟨
                    </span>
                </button>
            </div>

            <div className="sidebar-content">
                <CacheMonitor invalidationLog={invalidationLog} isCollapsed={isCollapsed} />
            </div>
        </aside>
    );
}
