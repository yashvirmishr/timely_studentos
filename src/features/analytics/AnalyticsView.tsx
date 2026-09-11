"use client";

import React from "react";
import type { Task, ClassEvent } from "@/lib/types";
import {
  DAY_LABELS,
  getCompletionRate,
  getEstimatedStudyHours,
  getWeekRange,
  getWorkloadData,
  weekdayIndex,
} from "@/lib/analytics";

interface AnalyticsViewProps {
  tasks: Task[];
  classes: ClassEvent[];
}

export default function AnalyticsView({ tasks, classes }: AnalyticsViewProps) {
  const completed = tasks.filter(task => task.completed).length;
  const total = tasks.length;
  const completionRate = getCompletionRate(tasks);
  const focusHours = getEstimatedStudyHours(tasks);
  const workloadData = getWorkloadData(tasks, classes);
  const hasWorkload = workloadData.some(value => value > 0);
  const maxWorkload = Math.max(1, ...workloadData);
  const currentDayIndex = weekdayIndex();
  const hasAnyData = total > 0 || classes.length > 0;

  const { start, end } = getWeekRange();
  const weekLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Patterns worth noticing</p>
          <h1>Small steps, <span className="red-underline">visible wins</span></h1>
          <p className="heading-subtitle">Your tracked academic rhythm · {weekLabel}</p>
        </div>
        <button className="text-button" onClick={() => {
          const report = `Timely report
${weekLabel}

Tasks: ${completed}/${total} complete
Estimated study load: ${focusHours.toFixed(1)} hours
Classes tracked: ${classes.length}`;
          const blob = new Blob([report], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "timely-report.txt";
          link.click();
          URL.revokeObjectURL(url);
        }}><span className="material-symbols-outlined">download</span>Export report</button>
      </div>

      {!hasAnyData && (
        <div className="empty-state paper-card" style={{ marginBottom: 22 }}>
          <span className="material-symbols-outlined">insights</span>
          <strong>Nothing tracked yet</strong>
          <p>
            Analytics fills in as you add classes and complete tasks. These
            numbers are always yours — never sample data.
          </p>
        </div>
      )}

      <div className="analytics-grid">
        <div className="analytics-card large paper-card">
          <div className="section-header compact">
            <div>
              <span className="section-kicker">Estimated study load</span>
              <h2>{focusHours.toFixed(1)}h <small>tracked</small></h2>
            </div>
            <span className="trend-badge">{hasWorkload ? "Live data" : "No data yet"}</span>
          </div>
          <div className="bar-chart">
            {DAY_LABELS.map((day, i) => (
              <span key={day} className={i === currentDayIndex ? "chart-today" : ""} style={{ height: hasWorkload ? `${(workloadData[i] / maxWorkload) * 100}%` : "2px" }}>
                <i>{day}</i>
              </span>
            ))}
          </div>
          {!hasWorkload && (
            <p style={{ fontSize: 13, color: "#777871", marginTop: 12 }}>
              Add classes or tasks with due dates to see your week take shape.
            </p>
          )}
        </div>
        <div className="analytics-card paper-card workload-card">
          <span className="section-kicker">Workload pulse</span>
          {hasWorkload ? (
            <>
              <h2>{total > 10 ? "Heavy" : total > 5 ? "Moderate" : "Light"} <span>{total > 10 ? "😰" : total > 5 ? "😐" : "☺"}</span></h2>
              <p>{total > 10 ? "Consider breaking tasks into smaller chunks." : "You've got breathing room this week."}</p>
              <div className="pulse-line">
                {workloadData.map((w, i) => <i key={i} className={i === currentDayIndex ? "active" : ""} style={{ height: `${(w / maxWorkload) * 100}%` }} />)}
              </div>
              <small><span>Low</span><span>Today</span><span>High</span></small>
            </>
          ) : (
            <>
              <h2>—</h2>
              <p>No tracked work to measure this week.</p>
            </>
          )}
        </div>
        <div className="analytics-card paper-card completion-card">
          <span className="section-kicker">Task rhythm</span>
          <div className="ring-chart" style={{ background: `conic-gradient(var(--blue) 0 ${completionRate ?? 0}%, #e4e9e8 ${completionRate ?? 0}% 100%)` }}>
            <strong>{completionRate === null ? "—" : completionRate}<small>{completionRate === null ? "" : "%"}</small></strong>
          </div>
          <div>
            <h3>Completion rate</h3>
            <p>{total === 0 ? "No tasks tracked yet" : `${completed} of ${total} tracked tasks complete`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}