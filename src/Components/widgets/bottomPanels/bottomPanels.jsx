import React from "react";
import "./bottomPanels.css";

const BottomPanel = ({ isBackendLive }) =>{
    return(<>
        <div className="bottom-panel">
            <div className="bottom-element-container">
                <div className="file-element">
                    <p>File System</p>
                    <div className="status-tag">
                        <p className="completed-status">Live</p>
                    </div>
                </div>
                <div className="file-element">
                    <p>Backend</p>
                    <div className="status-tag">
                        <p className={`${isBackendLive ? "completed-status" : "pending-status"}`}>{ isBackendLive ? "Connected" : "Disconnected"}</p>
                    </div>
                </div>
            </div>
        </div>
    </>)
}

export default BottomPanel