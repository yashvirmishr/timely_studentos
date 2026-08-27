"use client";

import React from "react";
import type { Task, ClassEvent } from "@/lib/types";

interface AnalyticsViewProps {
  tasks: Task[];
  classes: ClassEvent[];
}

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getCompletedTasksThisWeek(tasks: Task[]): number {
  return tasks.filter(t => t.completed).length;
}

function getTotalTasksThisWeek(tasks: Task[]): number {
  return tasks.length;
}

function getEstimatedStudyHours(tasks: Task[]): number {
  return tasks.reduce((acc, t) => acc + (parseInt(t.time, 10) || 0), 0) / 60;
}

function getWorkloadData(tasks: Task[], classes: ClassEvent[]): number[] {
  const dayIndexes: Record<string, number> = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4 };
  const workload = [0, 0, 0, 0, 0, 0, 0];
  classes.forEach(cls => {
    const index = dayIndexes[cls.day];
    if (index !== undefined) workload[index] += 1;
  });
  tasks.forEach(task => {
    const due = task.due.toLowerCase();
    const index = due === "today" ? new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
      : due === "tomorrow" ? (new Date().getDay() + 6) % 7
      : ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].findIndex(day => due.startsWith(day));
    if (index >= 0) workload[index] += 1;
  });
  return workload.some(value => value > 0) ? workload : [1, 1, 1, 1, 1, 0, 0];
}

export default function AnalyticsView({ tasks, classes }: AnalyticsViewProps) {
  const completed = getCompletedTasksThisWeek(tasks);
  const total = getTotalTasksThisWeek(tasks);
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const focusHours = getEstimatedStudyHours(tasks);
  const workloadData = getWorkloadData(tasks, classes);
  const maxWorkload = Math.max(...workloadData);
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

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
          const report = `Timely report\\n${weekLabel}\\n\\nTasks: ${completed}/${total} complete\\nEstimated study load: ${focusHours.toFixed(1)} hours\\nClasses tracked: ${classes.length}`;
          const blob = new Blob([report], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "timely-report.txt";
          link.click();
          URL.revokeObjectURL(url);
        }}><span className="material-symbols-outlined">download</span>Export report</button>
      </div>
      <div className="analytics-grid">
        <div className="analytics-card large paper-card">
          <div className="section-header compact">
            <div>
              <span className="section-kicker">Estimated study load</span>
              <h2>{focusHours.toFixed(1)}h <small>tracked</small></h2>
            </div>
            <span className="trend-badge">Live data</span>
          </div>
          <div className="bar-chart">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
              <span key={day} className={i === todayIndex ? "chart-today" : ""} style={{ height: `${(workloadData[i] / maxWorkload) * 100}%` }}>
                <i>{day}</i>
              </span>
            ))}
          </div>
        </div>
        <div className="analytics-card paper-card workload-card">
          <span className="section-kicker">Workload pulse</span>
          <h2>{total > 10 ? "Heavy" : total > 5 ? "Moderate" : "Light"} <span>{total > 10 ? "😰" : total > 5 ? "😐" : "☺"}</span></h2>
          <p>{total > 10 ? "Consider breaking tasks into smaller chunks." : "You've got breathing room this week."}</p>
          <div className="pulse-line">
            {workloadData.map((w, i) => <i key={i} className={i === todayIndex ? "active" : ""} style={{ height: `${(w / maxWorkload) * 100}%` }} />)}
          </div>
          <small><span>Low</span><span>Today</span><span>High</span></small>
        </div>
        <div className="analytics-card paper-card completion-card">
          <span className="section-kicker">Task rhythm</span>
          <div className="ring-chart"><strong>{completionRate}<small>%</small></strong></div>
          <div>
            <h3>Completion rate</h3>
            <p>{completed} of {total} tracked tasks complete</p>
          </div>
        </div>
      </div>
    </div>
  );
}