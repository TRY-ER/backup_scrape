import React, { useEffect, useRef, useState } from "react";
import "./CreateJobPage.css";

function FileUploader({ file, setFile, error, setError }) {

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (validateFile(selectedFile)) {
            setFile(selectedFile);
            setError("");
        } else {
            setFile(null);
            setError("Invalid file type. Only .csv and .xlsx files are allowed.");
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (validateFile(droppedFile)) {
            setFile(droppedFile);
            setError("");
        } else {
            setFile(null);
            setError("Invalid file type. Only .csv and .xlsx files are allowed.");
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const validateFile = (file) => {
        const allowedTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
        return file && allowedTypes.includes(file.type);
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
                border: "2px dashed #ccc",
                borderRadius: "10px",
                padding: "20px",
                textAlign: "center",
                width: "200px",
                margin: "20px auto",
            }}
        >
            <input
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                id="fileInput"
            />
            <label
                htmlFor="fileInput"
                style={{ cursor: "pointer", display: "block", marginBottom: "10px" }}
            >
                {file ? (
                    <>
                        <p>Filename: {file.name}</p>
                        <p>File size: {(file.size / 1024).toFixed(2)} KB</p>
                    </>
                ) : (
                    "Click or Drag & Drop a CSV or XLSX file here"
                )}
            </label>
            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
}

export {FileUploader};