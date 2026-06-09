import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import StatChip from "./StatChip";
import { getProjectInitials, getProjectPalette } from "../utils/projectStyle";
import type { Project } from "../types";

interface ProjectCardProps {
  readonly project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const palette = getProjectPalette(project.id);

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`h-1 w-full bg-gradient-to-r ${palette.gradient} opacity-80`} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm ${palette.gradient}`}
          >
            {getProjectInitials(project.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-lg text-slate-900 truncate group-hover:text-brand-700">
              {project.name}
            </h2>
            <p className="text-sm text-slate-500 font-mono mt-0.5">{project.code}</p>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
          {project.description || "No description yet."}
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          <StatChip label="Features" value={project.feature_count ?? 0} tone="tasks" />
          <StatChip label="Sprints" value={project.sprint_count ?? 0} tone="tasks" />
          <StatChip label="Tasks" value={project.task_count ?? 0} tone="tasks" />
          <StatChip label="Bugs" value={project.bug_count ?? 0} tone="bugs" />
          <StatChip label="Members" value={project.member_count ?? 0} tone="members" />
        </div>
      </div>
    </Link>
  );
}
