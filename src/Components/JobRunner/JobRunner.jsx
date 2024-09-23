import React, { useEffect, useState, useMemo, useRef, useCallback, act } from "react";
import { useParams } from "react-router-dom";
import "./JobRunner.css";
import { useNavigate } from "react-router-dom";
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import "ag-grid-community/styles/ag-grid.css"; // Mandatory CSS required by the Data Grid
import "ag-grid-community/styles/ag-theme-quartz.css"; // Optional Theme applied to the Data Grid
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { FileUploader } from "../CreateJobPage/CreateJobPage";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { BASE_API_URL, MAX_NUM_THREAD, zip } from "../../App";


// timer functions
const seconds2String = (sec) => {
    return `${Math.floor(sec / 3600)} Hr ${Math.floor((sec % 3600) / 60)} Min ${Math.floor((sec % 3600) % 60)} Sec `;
}

const calculateETA = (sec, total, progress) => {
    const mean = (sec / progress)
    const eta = mean * (total - progress)
    return eta
}


const SimpleBatchComponent = ({ activeContent }) => {
    const [content, setContent] = useState([]);
    const gridRef = useRef(null);

    useEffect(() => {
        const mod = []
        activeContent.forEach((item) => {
            if (item !== undefined) {
                if (item["Websites"] !== "http://") {
                    mod.push(item)
                }
            }
        })
        setContent(mod)
    }, [activeContent])

    useEffect(() => {
        if (gridRef.current && gridRef.current.api) {
            // Get the last row index
            const lastRowIndex = content.length - 1;
            // Scroll to the last row
            gridRef.current.api.ensureIndexVisible(lastRowIndex, 'middle');
        }
    }, [content])

    const columnDefs = [
        {
            headerName: "S. No.",
            valueGetter: (params) => params.node.rowIndex + 1,
            width: 80,
            cellStyle: { textAlign: "center" },
        },
        { headerName: "Websites", field: "Websites" },
        { headerName: "Primary Email", field: "Primary Email" },
        { headerName: "Secondary Email", field: "Secondary Email" },
        { headerName: "Contact URL", field: "Contact URL" },
        { headerName: "Facebook URL", field: "Facebook URL" },
        { headerName: "Primary URL", field: "Primary Email Source" },
        { headerName: "Secondary URL", field: "Secondary Email Source" }
    ];

    const defaultColDef = useMemo(() => {
        return {
            editable: true,
            flex: 1,
            minWidth: 100,
        };
    }, []);

    return (<>
        <div className={"ag-theme-quartz batch-tray"}>
            <AgGridReact
                ref={gridRef}
                rowData={content}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                animateRows={true}
                columnHoverHighlight={true}
            />
        </div>
    </>)
}

const BatchVerbose = ({ runState, progressNum, maxNum, elapsedTime, remainTime, activeContent }) => {
    const [percentProgress, setPercentProgress] = useState(0)
    const [showBatch, setShowBatch] = useState(true);


    useEffect(() => {
        setPercentProgress((progressNum / maxNum) * 100)
    }, [progressNum])
    return (
        <>
            <div className="batch-container">
                <>
                    <div className="batch-tray-component" >
                        <div className="batch-component"
                            onClick={() => { setShowBatch(!showBatch) }}
                        >
                            <div className="current-progress">
                                <div className="batch-progress-details">
                                    {runState === "init" && <p>Yet to Start</p>}
                                    {runState === "run" && <p>In Progress</p>}
                                    {runState === "scrapped" && <p>Completed</p>}
                                    {runState === "stopped" && <p>Stopped</p>}
                                    <p>({progressNum} Processed out of {maxNum})</p>
                                    <p>{progressNum === 0 ? "0" : percentProgress.toFixed(2)} %</p>
                                </div>
                                <div className="batch-progress-bar">
                                    <div className="batch-progress-bar-fill" style={{ width: `${progressNum === 0 ? 0 : percentProgress}%`, backgroundColor: `${runState === "stopped" ? "red" : "green"}` }}></div>
                                    {/* <div className="batch-progress-bar-fill" style={{ width: `20%` }}></div> */}
                                </div>
                                <div className="batch-time-details">
                                    <p>Elapsed: {elapsedTime} </p>
                                    <p>Remaining: {remainTime} </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </>
                {showBatch &&
                    <SimpleBatchComponent activeContent={activeContent} />
                }
            </div>
        </>
    )
}


const RunContent = ({ masterShow,
    file, setFile,
    runState, setRunState,
    seconds,
    headerErrorMessage,
    backend, setBackend,
    NUM_THREADS, SET_NUM_THREADS,
    handleCSVExport,
    handleXLSExport,
    setMasterCpoint }) => {

    const [singleDataSite, setSingleDataSite] = useState("");

    useEffect(() => {
        console.log("run state >>", runState)
    }, [runState])

    const singleDataViewClick = (site) => {
        setMasterCpoint([{ batch: 0, data: [site] }])
        setRunState("run");
    }


    return (<>
        <div className="right-tab-main">

            {
                runState === "init" || runState === "file" ?
                    < FileHandlerComponent file={file} setFile={setFile} setRunState={setRunState} runState={runState} />
                    : ""
            }

            {runState === "file" &&
                <>
                    <div className="file-state-components">
                        <p style={{ textAlign: "left" }}>Threads</p>
                        <div className="start-container">
                            <input value={NUM_THREADS} onChange={(e) => { SET_NUM_THREADS(e.target.value) }} type="number" />
                        </div>
                    </div>
                </>
            }
            {headerErrorMessage !== '' && <p className="warn-text">{headerErrorMessage}</p>}
            <div className="number-status-section">
                <div className="number-status-subsection" >
                    <p className="section-number" >{masterShow?.urlProcessed}</p>
                    <p className="section-text" > URL Processed</p>
                </div>
                <div className="number-status-subsection">
                    <p className="section-number">{masterShow?.primaryEmailFound}</p>
                    <p >Primary Email-id Found</p>
                </div>
                <div className="number-status-subsection">
                    <p className="section-number">{masterShow?.secondaryEmailFound}</p>
                    <p className="section-text">Secondary Email-id Found</p>
                </div>
                <div className="number-status-subsection">
                    <p className="section-number">{masterShow?.facebookUrlFound}</p>
                    <p>Facebook URL Found</p>
                </div>
                <div className="number-status-subsection">
                    <p className="section-number">{masterShow?.contactUrlFound}</p>
                    <p>Contact URL Found</p>
                </div>
                <div className="number-status-subsection">
                    <p className="section-number">{masterShow?.overallExtractionEfficiency} %</p>
                    <p>Success Rate</p>
                </div>
            </div>
            <div className="export-container">
                <div className="export-section">
                    <div className="img-btn">
                        <img src="Assets/Icons/export.png" style={{ width: "25px" }}></img>
                    </div>
                    <p className="export-section-text"><span style={{ textDecoration: "underline" }}>E</span>XPORT</p>
                    <div className="img-btn">
                        <img src="Assets/Icons/csv.png"
                            onClick={handleCSVExport}
                        ></img>
                    </div>
                    <div className="img-btn"
                        onClick={handleXLSExport}
                    >
                        <img src="Assets/Icons/xls.png"></img>
                    </div>
                </div>
                <div className="single-data-view">
                    <input placeholder="Single Data View"
                        disabled={runState !== "init" ? "disabled" : ""}
                        value={singleDataSite}
                        onChange={(e) => { setSingleDataSite(e.target.value) }}
                    />

                    <div className="divider" />
                    <div className="img-btn"
                        onClick={() => { singleDataViewClick(singleDataSite) }}
                    >
                        <img src="Assets/Icons/arrow.png" style={{ width: "20px", margin: "5px" }}></img>
                    </div>
                </div>

            </div>
        </div>
    </>)
}

const TickIcon = ({ isChecked }) => {
    const circleColor = isChecked ? 'green' : 'gray'; // Conditionally set the background color
    const tickColor = 'white'; // The color of the tick

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20px"
            height="20px"
        >
            {/* Circle background */}
            <circle cx="12" cy="12" r="12" fill={circleColor} />

            {/* Tick mark */}
            <path
                d="M20.285 6.708l-11.293 11.293-5.285-5.293 1.42-1.41 3.865 3.885 9.864-9.885z"
                fill={tickColor}
            />
        </svg>
    );
};


const PauseContent = ({ Navigate }) => {
    return (<>
        <div className="right-tab-main">
            <div className="current-state">
                <p><strong>Current State</strong></p>
                <div className="separator"></div>
                <p>Batch 8/10</p>
                <p>Batch Completed: 6.9%</p>
                <p>Overall Completed: 6.9%</p>
                <p>Elapsed: 1 Hr 9 Min 20sec</p>
                <p>Remaining: 1 Hr 9 Min 20sec</p>
            </div>
            <div className="separator"></div>
            <div className="pause-btn-container">
                <button className="pause-btn">Pause</button>
                <button className="stop-btn">Stop</button>
            </div>
            <div className="pause-steps">
                <div className="tick-container">
                    <TickIcon isChecked={true} />
                    <p>Stoping Endpoint</p>
                </div>
                <div className="tick-container">
                    <TickIcon isChecked={false} />
                    <p>Retrieving Checkpoint</p>
                </div>
                <div className="tick-container">
                    <TickIcon isChecked={false} />
                    <p>Save Checkpoint</p>
                </div>
            </div>
            <div className="separator"></div>
            <button className="job-redir"
                onClick={() => Navigate("/jobs")}
            >All Jobs</button>
        </div>
    </>)
}

const StopContent = ({ runState, setRunState, maxNumBatches,
    currentBatch, seconds, setTabMenu, eventSourceRef, setMasterCpoint,
    setActiveBatchIndex, pauseTimer }) => {

    const Navigate = useNavigate();
    const [elapsedTime, setElapsedTime] = useState("0 Hr 0 Min 0sec")
    const [stopState, setStopState] = useState(0)

    useEffect(() => {
        if (seconds > 0) {
            setElapsedTime(seconds2String(seconds));
        }
    }, [seconds])

    const handleStop = () => {
        try {
            eventSourceRef.current.close();
            eventSourceRef = null;
            setStopState(1);
            setActiveBatchIndex(-2)
            setMasterCpoint((prev) => {
                return prev.map((batch, index) => {
                    if (index === currentBatch - 1) {
                        return { ...batch, state: "stopped" }
                    }
                    return batch;
                })
            })
            setStopState(2);
            pauseTimer();
            setRunState("scrapped");
        }
        catch (e) {
            console.log("error in closing event source >>", e)
        }
    }

    return (<>
        <div className="right-tab-main">
            <div className="current-state">
                <p><strong>Current State</strong></p>
                <div className="separator"></div>
                {runState === "run" &&
                    <>
                        <p>Batch {currentBatch}/{maxNumBatches}</p>
                        <p>Completed: {(currentBatch - 1 / maxNumBatches).toFixed(2)}%</p>
                        <p>Elapsed: {elapsedTime}</p>
                    </>
                }

                {runState === "init" &&
                    <>
                        <p>The process is yet to start !</p>
                    </>
                }

                {runState === "scrapped" || runState === "merged" ?
                    <>
                        <p>The scrapping process is complete !</p>
                    </>
                    : ""
                }
            </div>

            {runState === "run" &&
                <>
                    <div className="separator"></div>
                    <p className="warn-text">* Stoping now will cause termination of processes and delete checkpoints</p>
                    <div className="stop-btn-container">
                        <button className="stop-btn"
                            onClick={handleStop}
                        >Stop</button>
                    </div>
                    <div className="pause-steps">
                        <div className="tick-container">
                            <TickIcon isChecked={stopState > 0 ? true : false} />
                            <p>Stopping Endpoint</p>
                        </div>
                        <div className="tick-container">
                            <TickIcon isChecked={stopState > 1 ? true : false} />
                            <p>Retrieving Checkpoint</p>
                        </div>
                    </div>
                </>
            }

            <div className="separator"></div>
            {runState === "scrapped" || runState === "merged" ?
                <div className="stop-btn-container">
                    <button className="export-btn"
                        onClick={() => setTabMenu("export")}
                    >Export</button>
                    <button className="export-btn"
                        onClick={() => Navigate("/jobs")}
                    >All Jobs</button>
                </div>
                : ""
            }
        </div>
    </>)
}

const ClearContent = ({ jobId, runState, setRunState, masterCpoint }) => {
    const [interalRunState, setInternalRunState] = useState("init");
    const [subRunState, setSubRunState] = useState("init");




    const handleExportRun = (masterCpoint) => {
        // validate the checkpoint
        var validate = true;
        for (let index = 0; index < masterCpoint.length; index++) {
            if (masterCpoint[index].state === "stopped") {
                break
            }
            else if (masterCpoint[index].state === "init") {
                alert("")
                validate = false;
                setInternalRunState("init");
                return
            }
        }
        if (validate) {
            setSubRunState("valid");
            const mergeRes = window.fileSystem.mergeCSVFiles(jobId);

            if (mergeRes.success) {
                setSubRunState("merge");
                setRunState("merged");
                setInternalRunState("merged");
            }
            else {
                alert(mergeRes.error)
            }
        }
        // export the final file
    }

    const exportContent = async () => {
        const exportRes = await window.fileSystem.exportFile(jobId);
        if (!exportRes.success) {
            console.error('Error exporting file:', exportRes.error || exportRes.message);
        } else {
            console.log(`File saved to: ${exportRes.path}`);
        }
    }

    useEffect(() => {
        if (interalRunState === "run") {
            handleExportRun(masterCpoint)
        }
    }, [interalRunState])

    return (<>
        <div className="right-tab-main">
            {interalRunState === 'init' &&
                <div className="stop-btn-container">
                    {
                        interalRunState === "init" &&
                        <button className="export-btn"
                            onClick={() => setInternalRunState("run")}
                        >Init Export</button>
                    }
                </div>
            }
            <div className="separator"></div>
            <div className="pause-steps">
                <div className="tick-container">
                    <TickIcon isChecked={subRunState !== "init" ? true : false} />
                    <p>Validating Export</p>
                </div>
                <div className="tick-container">
                    <TickIcon isChecked={subRunState === "merge" ? true : false} />
                    <p>Merging Batch Chunks</p>
                </div>
                <div className="tick-container">
                    <TickIcon isChecked={subRunState === "merge" ? true : false} />
                    <p>Writting Master File</p>
                </div>


                <div className="stop-btn-container">
                    {
                        interalRunState === "merged" &&
                        <button className="export-btn"
                            onClick={exportContent}
                        >Export File</button>

                    }
                </div>
            </div>
        </div>
    </>)
}


const ConsoleContent = ({ messages }) => {
    const consoleEndRef = useRef(null);


    // Effect to scroll to the bottom when a new message is added
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Function to scroll to the bottom of the console
    const scrollToBottom = () => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (<>
        <div className="console-content">
            <div className="console-header">Console</div>
            <div className="console-log-container">
                {messages.map((message, index) => (
                    <>{message}</>
                ))}
                <div ref={consoleEndRef} />
            </div>
        </div>
    </>)
}

const ConsoleMessage = ({ data }) => {
    return (<>
        <p className={`console-message ${data?.type}`}>{data?.message}</p>
        <br />
    </>)
}

const FileHandlerComponent = ({ file, setFile, setRunState, runState }) => {
    const [error, setError] = useState("");
    const [fileViewState, setFileViewState] = useState("init");
    const [numRows, setNumRows] = useState(0);

    useEffect(() => {
        if (file) {
            analyzeFile(file);
            setFileViewState("file");
            if (runState === "init") {
                setRunState('file');
            }
        }
    }, [file])


    useEffect(() => {
        if (error !== '') {
            setFileViewState("init");
            setRunState("init");
        }
    }, [error])


    const analyzeFile = (file) => {
        if (file.type === "text/csv") {
            analyzeCSV(file);
        } else {
            analyzeXLSX(file);
        }
    };

    const analyzeCSV = (file) => {
        Papa.parse(file, {
            complete: (result) => {
                const rows = result.data;
                setNumRows(rows.length);
            },
            header: true
        });
    };

    const analyzeXLSX = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            setNumRows(rows.length);
        };
        reader.readAsArrayBuffer(file);
    };


    return (<>
        <div className="file-browse-section">
            <p className="browse-text">Browse</p>
            <FileUploader file={file} setFile={setFile} error={error} setError={setError} />
            {fileViewState === "file" &&
                <p className="browse-selected-text">Total Domain Selected ({numRows})</p>
            }
        </div>
    </>)
}


const JobRunner = ({ isBackendLive }) => {
    const { jobId } = useParams();
    const [tabMenu, setTabMenu] = useState("run");
    const [tab, setTab] = useState("control");
    const [runState, setRunState] = useState("init");
    const [file, setFile] = useState(null);
    const Navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [masterCpoint, setMasterCpoint] = useState([]);
    const [masterShow, setMasterShow] = useState({
        urlProcessed: 0,
        primaryEmailFound: 0,
        primaryEmailNotFound: 0,
        secondaryEmailFound: 0,
        secondaryEmailNotFound: 0,
        facebookUrlFound: 0,
        facebookUrlNotFound: 0,
        contactUrlFound: 0,
        overallExtractionEfficiency: 0
    });
    const [activeBatchIndex, setActiveBatchIndex] = useState(-1);
    const [activeContent, setActiveContent] = useState([]);
    const [activeRunningIndex, setActiveRunningIndex] = useState(-1);
    const [baseCheckpoint, setBaseCheckpoint] = useState({});
    const activeContentRef = useRef(activeContent);
    const masterShowRef = useRef(masterShow);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const secondsRef = useRef(seconds);
    const baseCheckpointRef = useRef(baseCheckpoint);
    const eventSourceRef = useRef(null);
    const [headerErrorMessage, setHeaderErrorMessage] = useState("");
    const [NUM_THREADS, SET_NUM_THREADS] = useState(3);
    const [showSideTab, setShowSideTab] = useState(true);
    const [backend, setBackend] = useState("http://localhost:8000")
    const [progressNum, setProgressNum] = useState(0);
    const [elapsedTime, setElapsedTime] = useState("0 Hr 0 Min 0sec");
    const [remainTime, setRemainTime] = useState("0 Hr 0 Min 0sec");


    useEffect(() => {
        baseCheckpointRef.current = baseCheckpoint;
    }, [baseCheckpoint])


    useEffect(() => {
        let timer;
        if (isActive) {
            // Start timer when isActive is true
            timer = setInterval(() => {
                setSeconds((prevSeconds) => prevSeconds + 1); // Increment seconds by 1 every second
            }, 1000);
        }

        // Cleanup interval on component unmount or when isActive changes
        return () => clearInterval(timer);
    }, [isActive]); // Dependency on isActive state


    useEffect(() => {
        if (seconds > 0) {
            const progressNum = masterShow.urlProcessed
            const maxNum = masterCpoint.length > 0 ? masterCpoint[0].data.length : 0
            setElapsedTime(seconds2String(seconds));
            if (progressNum > 0) {
                setRemainTime(seconds2String(calculateETA(seconds, maxNum, progressNum)));
            }
        }
    }, [seconds])


    // Function to start the timer
    const startTimer = () => {
        setIsActive(true);
    };

    // Function to pause the timer
    const pauseTimer = () => {
        setIsActive(false);
    };

    // Function to reset the timer
    const resetTimer = () => {
        setIsActive(false); // Pause the timer
        setSeconds(0); // Reset seconds to 0
    };

    useEffect(() => {
        secondsRef.current = seconds;
    }, [seconds])

    useEffect(() => {
        activeContentRef.current = activeContent
    }, [activeContent])

    useEffect(() => {
        masterShowRef.current = masterShow
    }, [masterShow])

    useEffect(() => {
        console.log("master c point", masterCpoint)
    }, [masterCpoint])

    // Function to add a new message to the console
    const addMessage = (data) => {
        setMessages((prevMessages) => [...prevMessages, <ConsoleMessage data={data} />]);
    };

    useEffect(() => {
        console.log("base checkpoint >>", baseCheckpoint)
    }, [baseCheckpoint])

    useEffect(() => {
        if (activeBatchIndex !== -1 && activeBatchIndex !== -2) {
            const batchContent = window.fileSystem.getBatchFile(jobId, activeBatchIndex + 1)
            console.log("batch content >>", batchContent.data)
            if (batchContent.success) {
                setActiveContent(batchContent.data);
            }
            else {
                alert(batchContent.message)
            }
        }
    }, [activeBatchIndex])


    useEffect(() => {
        console.log("activeContent", activeContent);
    }, [activeContent])

    const splitRemain = (NUM_THREADS, batchContent) => {
        const urls = {}

        for (var i = 0; i < NUM_THREADS; i++) {
            urls[`${i}`] = {};
        }

        var processRepo = []

        batchContent.data.forEach((batchdata, batchIndex) => {
            const val = { [String(batchIndex)]: batchdata }
            processRepo = [...processRepo, val]
        })

        var counter = 0;
        processRepo.forEach((item, index) => {
            if (counter === NUM_THREADS - 1) {
                urls[`${counter}`] = { ...urls[`${counter}`], ...item }
                counter = 0;
            }
            else {
                urls[`${counter}`] = { ...urls[`${counter}`], ...item }
                counter += 1;
            }
        })

        return urls
    }


    const modActiveContent = (data) => {
        if (data.type === "success") {
            var id = data.id;
            if (data.data.type === "success") {
                setMasterShow((prev) => {
                    return {
                        ...prev,
                        urlProcessed: prev.urlProcessed + 1,
                        primaryEmailFound: data.data.data.primary_email === "" || data.data.data.primary_email === "timeout" || data.data.data.primary_email === "check address" ? prev.primaryEmailFound : prev.primaryEmailFound + 1,
                        primaryEmailNotFound: data.data.data.primary_email === "" || data.data.data.primary_email === "timeout" || data.data.data.primary_email === "check address" ? prev.primaryEmailNotFound + 1 : prev.primaryEmailNotFound,
                        secondaryEmailFound: data.data.data.secondary_email === "" || data.data.data.secondary_email === "timeout" || data.data.data.secondary_email === "check address" ? prev.secondaryEmailFound : prev.secondaryEmailFound + 1,
                        secondaryEmailNotFound: data.data.data.secondary_email === "" || data.data.data.secondary_email === "timeout" || data.data.data.secondary_email === "check address" ? prev.secondaryEmailNotFound + 1 : prev.secondaryEmailNotFound,
                        facebookUrlFound: data.data.data.facebook_url === "" || data.data.data.facebook_url === "timeout" || data.data.data.facebook_url === "check address" ? prev.facebookUrlFound : prev.facebookUrlFound + 1,
                        facebookUrlNotFound: data.data.data.facebook_url === "" || data.data.data.facebook_url === "timeout" || data.data.data.facebook_url === "check address" ? prev.facebookUrlNotFound + 1 : prev.facebookUrlNotFound,
                        contactUrlFound: data.data.data.contact_us_url === "" || data.data.data.contact_us_url === "timeout" || data.data.data.contact_us_url === "check address" ? prev.contactUrlFound : prev.contactUrlFound + 1,
                        overallExtractionEfficiency: (((prev.primaryEmailFound + 1) / (prev.urlProcessed + 1)) * 100).toFixed(2),
                    }
                })
                setActiveContent((prevContent) => {
                    const newItems = [...prevContent];
                    var primary_email = ""
                    var primary_email_source = ""
                    var secondary_email = ""
                    var secondary_email_source = ""
                    if (["timeout", "check address", ""].includes(data.data.data.primary_email)) {
                        primary_email = data.data.data.primary_email
                        primary_email_source = ""
                    }
                    else {
                        var match = data.data.data.primary_email.match(/^([^ ]+) \[([^\]]+)\]$/);
                        primary_email = match[1]
                        primary_email_source = match[2]
                        if (data.data.data.secondary_email !== "") {
                            var match = data.data.data.secondary_email.match(/^([^ ]+) \[([^\]]+)\]$/);
                            secondary_email = match[1]
                            secondary_email_source = match[2]
                        }
                    }

                    console.log("modified emails w add >>", primary_email, secondary_email, primary_email_source, secondary_email_source)

                    newItems[id] = {
                        ...newItems[id],
                        "Websites": data.data.data.website,
                        "Primary Email": primary_email,
                        "Secondary Email": secondary_email,
                        "Contact URL": data.data.data.contact_us_url,
                        "Facebook URL": data.data.data.facebook_url,
                        "Primary Email Source": primary_email_source,
                        "Secondary Email Source": secondary_email_source,
                    }
                    return newItems;
                })
                console.log(activeContent);
            }
            else {
                setActiveContent((prevContent) => {
                    const newItems = [...prevContent];
                    newItems[id] = {
                        ...newItems[id],
                        "Primary Email": "Error",
                        "Secondary Email": "Error",
                        "Contact URL": "Error",
                        "Facebook URL": "Error",
                        "Scrapped": true,
                    }
                    return newItems;
                })
            }
        }

        else if (data.type === "command") {
            if (data.message === "completed") {
                if (data.batch === masterCpoint.length - 1) {
                    setActiveBatchIndex(-2);
                }
                else {
                    // setActiveBatchIndex(data.batch + 1);
                }
            }
        }
    }

    const handleWriteCheckpoint = async (jobId, Cpoint, seconds) => {
        const now = new Date();
        const formattedDate = now.toISOString();
        console.log("seconds in checkpoint >>", seconds)
        const res = window.fileSystem.writeCheckpoint(jobId,
            {
                ...baseCheckpoint,
                'updated_at': formattedDate,
                'last_checkpoint': Cpoint,
                'counter': masterShowRef.current,
                'seconds': seconds
            }
        )
        console.log("checkpoint write res >>", res);
    }

    useEffect(() => {
        handleWriteCheckpoint(jobId, masterCpoint, seconds);
    }, [activeBatchIndex])

    const writeJobStatus = async (state) => {
        console.log("baseCheckpoint on state change >>", baseCheckpoint)
        if (baseCheckpoint?.status) {
            const now = new Date();
            const formattedDate = now.toISOString();
            const res = window.fileSystem.writeCheckpoint(jobId,
                {
                    ...baseCheckpointRef.current,
                    'updated_at': formattedDate,
                    'last_checkpoint': masterCpoint,
                    'counter': masterShowRef.current,
                    'seconds': seconds,
                    'status': state
                }
            )
            console.log("checkpoint status write res >>", res);
        }
    }

const handleRun = () => {
    const processItemsSequentially = async () => {
        for (let index = 0; index < masterCpoint.length; index++) {
            const item = masterCpoint[index];
            console.log('checkpoint values >>', item, index);
            const requestId = uuidv4();
            const splitURLs = splitRemain(NUM_THREADS, item)
            // setActiveBatchIndex(index);
            startTimer();
            await new Promise((resolve, reject) => {
                const requestData = {
                    "request_id": requestId,
                    "data": {
                        "batch": item.batch,
                        "urls": splitURLs
                    }
                };

                // Send the request
                axios.post(`${BASE_API_URL}/stream_data/set_request/`, requestData)
                    .then((res) => {
                        console.log("setting request", res.data);
                        addMessage(res.data);
                        // setRunState("run");

                        // Receive SSE event using the request_id
                        const eventSource = new EventSource(`${BASE_API_URL}/stream_data/get_request/${requestData.request_id}/`);
                        eventSourceRef.current = eventSource;
                        eventSource.onmessage = (event) => {
                            const data = JSON.parse(event.data);
                            console.log("stream data>>", data);
                            console.log("active content on message >>", activeContentRef.current)
                            addMessage({ "type": data.type, "message": JSON.stringify(data) });
                            modActiveContent(data);
                        };

                        eventSource.onerror = (error) => {
                            console.error("EventSource failed: ", error);
                            addMessage({ "type": "error", "message": "Failed to connect to stream." }, setMessages);
                            console.log("active before csv >>", activeContentRef.current)
                            // handleWriteCSV(jobId, index + 1, activeContentRef.current);
                            eventSource.close();  // Close the connection on error
                            resolve();  // Resolve promise to move to next iteration
                        };

                    }).catch((err) => {
                        addMessage(err);
                        reject(err);  // Reject the promise on error to prevent proceeding
                    });
            });
            if (index === masterCpoint.length - 1) {
                pauseTimer();
            }
        }
        setRunState("scrapped");
    }

    // Call the async function to start processing
    processItemsSequentially();
}

useEffect(() => {
    if (runState === "verify") {
        axios.get(`${BASE_API_URL}/stream_data/ping`).then((res) => {
            console.log("ping res >>", res)
            if (res.data.message === 'end_point available') {
                const datares = window.fileSystem.readCSVFile(file.path)
                console.log("data res >>", datares)
                if (datares.success) {
                    setMasterCpoint([{ batch: 0, data: datares.data }])
                    setRunState("run");
                }
                else {
                    setRunState("file");
                    setFile(null);
                    setHeaderErrorMessage("Make sure to keep 'Websites' as header and try again !")
                }
            }
        }).catch((err) => {
            setRunState("init");
            setHeaderErrorMessage("Endpoint for scrapping is unavailable !")
        })

    }
    if (runState === "run") handleRun();
    if (runState === "stopped") {
        axios.get('http://localhost:8000/stream_data/stop_threads')
            .then(response => {
                console.log("Threads stopping response:", response.data);
                eventSourceRef.current.close();
                pauseTimer();
                setRemainTime("0 Hr 0 Min 0 sec")
                setTabMenu("run")
            })
            .catch(error => {
                console.error("Error stopping threads:", error);
            });
    }
}, [runState])

useEffect(() => {
    console.log("active [mod] content >>", activeContent)
}, [activeContent])

const getValid = (activeContent) => {
    const mod = []
    activeContent.forEach((item) => {
        if (item !== undefined) {
            if (item["Websites"] !== "http://") {
                mod.push({
                    "Websites": item["Websites"],
                    "Primary Email": item["Primary Email"],
                    "Secondary Email": item["Secondary Email"],
                    "Contact URL": item["Contact URL"],
                    "Facebook URL": item["Facebook URL"],
                    "Primary Email Source": item["Primary Email Source"],
                    "Secondary Email Source": item["Secondary Email Source"]
                })
            }
        }
    })
    return mod
}

const handleCSVExport = async () => {
    if (runState === "scrapped" || runState === "stopped") {
        const exportRes = await window.fileSystem.exportFile("csv", getValid(activeContent))
        if (exportRes.success) {
            console.log("export res >>", exportRes)
        }
        else {
            alert(exportRes.error)
        }

    }
}

const handleXLSExport = async () => {
    if (runState === "scrapped" || runState === "stopped") {
        const exportRes = await window.fileSystem.exportFile("xlsx", getValid(activeContent))
        if (exportRes.success) {
            console.log("export res >>", exportRes)
        }
        else {
            alert(exportRes.error)
        }
    }
}

const handleStop = () => {
    setTabMenu("stop")
    if (runState === "run") {
        setRunState("stopped")
    }
}


const handleClear = () => {
    setTabMenu("clear")
    setRunState("init")
    setMasterShow({
        urlProcessed: 0,
        urlNotFound: 0,
        primaryEmailFound: 0,
        primaryEmailNotFound: 0,
        secondaryEmailFound: 0,
        secondaryEmailNotFound: 0,
        facebookUrlFound: 0,
        contactUrlFound: 0,
        facebookUrlNotFound: 0,
        overallExtractionEfficiency: 0,
    })
    setActiveContent([])
    setFile(null)
    setHeaderErrorMessage("")
    setSeconds(0);
    setElapsedTime("0 Hr 0 Min 0 Sec")
    setRemainTime("0 Hr 0 Min 0 Sec")
}

const handleRunTabClick = () => {
    setTabMenu("run")
    if (runState === "file") {
        setRunState("verify")
    }
}


return (
    <>
        <div className="job-runner-container">
            <div className="job-runner-main-container">
                <div className="job-runner-left-container">
                    <div className="job-batch-container">
                        <BatchVerbose
                            runState={runState}
                            progressNum={masterShow.urlProcessed}
                            maxNum={masterCpoint.length > 0 ? masterCpoint[0].data.length : 0}
                            elapsedTime={elapsedTime}
                            remainTime={remainTime}
                            activeContent={activeContent}
                        />
                    </div>
                </div>
                {
                    <div className="job-runner-right-container" style={showSideTab ? { display: "flex" } : { display: "none" }}>
                        <div className="right-main-container">
                            {
                                tab === "control" &&
                                <>
                                    <>
                                        <div className="right-component">
                                            <div className="right-tabs">
                                                <button style={tabMenu === "run" ? { backgroundColor: "green" } : {}} onClick={handleRunTabClick} className={`header-btn ${tabMenu === "run" ? "active" : ""}`}>
                                                    <img src="Assets/Icons/play.png" className={`btn-sub-img-height ${tabMenu === "run" ? "invert" : ""}`} />
                                                    Run</button>
                                                {/* <button onClick={() => setTabMenu("pause")} className={`${tabMenu === "pause" ? "active" : ""}`}>Pause</button> */}
                                                <button style={tabMenu === "stop" ? { backgroundColor: "red" } : {}} onClick={handleStop} className={`header-btn ${tabMenu === "stop" ? "active" : ""}`}>
                                                    <img src="Assets/Icons/stop.png" className={`btn-sub-img-height ${tabMenu === "stop" ? "invert" : ""}`} />
                                                    Stop</button>
                                                <button style={tabMenu === "clear" ? { backgroundColor: "blue" } : {}} onClick={handleClear} className={`header-btn ${tabMenu === "clear" ? "active" : ""}`}>
                                                    <img src="Assets/Icons/close.png" className={`btn-sub-img-height ${tabMenu === "clear" ? "invert" : ""}`} />
                                                    Clear</button>
                                            </div>
                                        </div>
                                    </>
                                    <RunContent masterShow={masterShow}
                                        file={file}
                                        setFile={setFile}
                                        runState={runState}
                                        setRunState={setRunState}
                                        masterCpoint={masterCpoint}
                                        seconds={seconds}
                                        setTabMenu={setTabMenu}
                                        headerErrorMessage={headerErrorMessage}
                                        showSideTab={showSideTab}
                                        backend={backend}
                                        setBackend={setBackend}
                                        NUM_THREADS={NUM_THREADS}
                                        SET_NUM_THREADS={SET_NUM_THREADS}
                                        handleCSVExport={handleCSVExport}
                                        handleXLSExport={handleXLSExport}
                                        setMasterCpoint={setMasterCpoint}
                                    />
                                </>
                            }
                            {
                                tab === "console" &&
                                <ConsoleContent messages={messages} />
                            }
                        </div>
                    </div>
                }
            </div>
            <div className="job-runner-bottom-container">
                <div className="left-bottom-container">
                    <div className="cr-container">
                        <img src="/Assets/Logo.png" alt="" />
                        <p className="cr-text">© 2023, CR Consultancy Services PVT LTD, All Rights Reserved</p>
                    </div>
                    <div className="tag-container">
                        <div className="number-status-subsection" >
                            <p className="section-number" >{masterShow.urlProcessed !== 0 ? (((masterShow.primaryEmailFound / masterShow.urlProcessed)) * 100).toFixed(1) : 0} %</p>
                            <p className="section-text" >Primary Email Success Rate</p>
                        </div>
                        <div className="number-status-subsection">
                            <p className="section-number">{masterShow.urlProcessed !== 0 ? ((masterShow.secondaryEmailFound / masterShow.urlProcessed) * 100).toFixed(1) : 0} %</p>
                            <p className="section-text">Secondary Email Success Rate</p>
                        </div>
                        <div className="number-status-subsection">
                            <p className="section-number">{masterShow.urlProcessed !== 0 ? ((masterShow.facebookUrlFound / masterShow.urlProcessed) * 100).toFixed(1) : 0} %</p>
                            <p className="section-text">Facebook Page Success Rate</p>
                        </div>
                        <div className="number-status-subsection">
                            <p className="section-number">{masterShow.urlProcessed !== 0 ? ((masterShow.contactUrlFound / masterShow.urlProcessed) * 100).toFixed(1) : 0} %</p>
                            <p className="section-text">Contact Page Success Rate</p>
                        </div>
                    </div>
                </div>
                <div className="status-container">
                    <div >
                        <button className="swap-btn"
                            onClick={() => setShowSideTab(!showSideTab)}
                        ><img src={`${showSideTab ? "Assets/Icons/hide.png" : "Assets/Icons/show.png"}`} className="btn-sub-img invert" />{showSideTab ? "Hide" : "Show"}</button>
                    </div>
                    <div className="pane-container">
                        <div className="tab-logo-container">
                            <img src="Assets/control.png" alt="logo"
                                className={`tab-logo ${tab === "control" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setTab("control")
                                    setShowSideTab(true);
                                }} />
                            <img src="Assets/console.png" alt="logo"
                                className={`tab-logo ${tab === "console" ? "tab-active" : ""}`}
                                onClick={() => {
                                    setTab("console")
                                    setShowSideTab(true);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
)
}

export default JobRunner;