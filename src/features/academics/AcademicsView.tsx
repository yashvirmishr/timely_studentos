"use client";

import React from "react";
import type { AddType, Subject, Task, AcademicFilter } from "@/lib/types";

interface AcademicsViewProps {
  onOpenQuickAdd: (type: AddType) => void;
  tasks: Task[];
  subjects: Subject[];
  academicFilter: AcademicFilter;
  setAcademicFilter: (filter: AcademicFilter) => void;
}

function getTaskCount(subjectName: string, tasks: Task[]): number {
  return tasks.filter(t => t.subject === subjectName && !t.completed).length;
}

function getCompletedCount(subjectName: string, tasks: Task[]): number {
  return tasks.filter(t => t.subject === subjectName && t.completed).length;
}

export default function AcademicsView({ onOpenQuickAdd, tasks, subjects, academicFilter, setAcademicFilter }: AcademicsViewProps) {
  const filteredSubjects = subjects.filter(s => {
    if (academicFilter === "all") return true;
    if (academicFilter === "active") return getTaskCount(s.name, tasks) >= 2;
    if (academicFilter === "attention") return s.urgent || s.preparedness < 60;
    return true;
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const studyMinutes = tasks.reduce((total, task) => total + (parseInt(task.time, 10) || 0), 0);
  const studyHours = studyMinutes >= 60 ? `${(studyMinutes / 60).toFixed(1)}h` : `${studyMinutes}m`;

  return (
    <div className="academics-view">
      <div className="page-heading">
        <div>
          <p className="eyebrow">The bigger picture</p>
          <h1>Your <span className="red-underline">academics</span></h1>
          <p className="heading-subtitle">
            {subjects.length} subjects · {tasks.filter(t => !t.completed).length} active tasks · {completionRate}% completion
          </p>
        </div>
        <div className="heading-actions">
          <button className="text-button" onClick={() => onOpenQuickAdd("task")}><span className="material-symbols-outlined">document_scanner</span>Scan homework</button>
          <button className="primary-button" onClick={() => onOpenQuickAdd("task")}><span className="material-symbols-outlined">add</span>Add task</button>
        </div>
      </div>
      <div className="academic-summary">
        <div className="summary-stat paper-card">
          <span className="stat-icon blue-icon"><span className="material-symbols-outlined">task_alt</span></span>
          <div><strong>{completionRate}%</strong><span>tasks completed</span></div>
          <small className="stat-up">↑ 12% this week</small>
        </div>
        <div className="summary-stat paper-card">
          <span className="stat-icon yellow-icon"><span className="material-symbols-outlined">schedule</span></span>
          <div><strong>{studyHours}</strong><span>estimated study load</span></div>
          <small className="stat-up">From tracked tasks</small>
        </div>
        <div className="summary-stat paper-card">
          <span className="stat-icon red-icon"><span className="material-symbols-outlined">local_fire_department</span></span>
          <div><strong>{subjects.find(s => s.urgent)?.tag || "No exam"}</strong><span>{subjects.find(s => s.urgent)?.name || "Add an exam subject"}</span></div>
          <small className="stat-alert">{subjects.find(s => s.urgent)?.preparedness || 0}% prepared</small>
        </div>
      </div>
      <div className="section-header academics-header">
        <div><span className="section-kicker">Your subjects</span><h2>Everything in one place</h2></div>
        <div className="filter-pills">
          <button className={academicFilter === "all" ? "active" : ""} onClick={() => setAcademicFilter("all")}>All</button>
          <button className={academicFilter === "active" ? "active" : ""} onClick={() => setAcademicFilter("active")}>Most active</button>
          <button className={academicFilter === "attention" ? "active" : ""} onClick={() => setAcademicFilter("attention")}>Needs attention</button>
        </div>
      </div>
      <div className="subject-grid">
        {filteredSubjects.map((s, i) => {
          const taskCount = getTaskCount(s.name, tasks);
          const completedCount = getCompletedCount(s.name, tasks);
          return (
            <article key={s.id} className={`paper-card subject-card subject-${s.color}`}>
              <div className="subject-top">
                <span className="subject-symbol">{s.symbol}</span>
                <button className="mini-more"><span className="material-symbols-outlined">more_horiz</span></button>
              </div>
              <h3>{s.name}</h3>
              <p>{s.teacher} · {s.room}</p>
              <div className="subject-meter">
                <span><i style={{width: `${s.preparedness}%`}} /></span>
                <small>{s.preparedness}% {s.preparedness >= 80 ? 'on track' : 'prepared'}</small>
              </div>
              <div className="subject-footer">
                <span>{taskCount} task{taskCount !== 1 ? 's' : ''} due</span>
                <span className={`subject-tag ${s.urgent ? 'urgent-tag' : ''}`}>{s.tag}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}