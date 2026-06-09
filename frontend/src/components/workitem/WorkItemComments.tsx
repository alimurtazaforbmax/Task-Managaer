import { FormEvent } from "react";
import UserAvatar from "../UserAvatar";
import type { Comment } from "../../types";
import WorkItemSection from "./WorkItemSection";

interface WorkItemCommentsProps {
  readonly type: "task" | "bug";
  readonly comments?: Comment[];
  readonly comment: string;
  readonly onCommentChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly placeholder?: string;
}

function authorName(comment: Comment): string {
  const u = comment.author_detail;
  if (!u) return "User";
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username;
}

export default function WorkItemComments({
  type,
  comments,
  comment,
  onCommentChange,
  onSubmit,
  placeholder = "Add a comment...",
}: WorkItemCommentsProps) {
  return (
    <WorkItemSection
      title={type === "bug" ? "Discussion" : "Comments"}
      subtitle={`${comments?.length ?? 0} message${comments?.length === 1 ? "" : "s"}`}
      accent={type}
    >
      <ul className="space-y-3">
        {!comments?.length && (
          <li className="text-sm text-slate-400 py-2">No comments yet. Start the conversation.</li>
        )}
        {comments?.map((c) => {
          const isRejection = c.comment_type === "rejection_reason";
          return (
            <li
              key={c.id}
              className={`rounded-xl border p-3 text-sm shadow-sm ${
                isRejection
                  ? "border-rose-200 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                {c.author_detail && (
                  <UserAvatar
                    name={authorName(c)}
                    photoUrl={c.author_detail.profile_picture_url}
                    seed={c.author_detail.id}
                    size="sm"
                  />
                )}
                <p className="font-medium text-slate-800">
                  {authorName(c)}
                  {isRejection && (
                    <span className="ml-2 text-rose-600 text-xs font-semibold uppercase">rejection</span>
                  )}
                </p>
              </div>
              <p className="mt-2 text-slate-700 leading-relaxed">{c.text}</p>
            </li>
          );
        })}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm"
          placeholder={placeholder}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
        />
        <button
          type="submit"
          className={`text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm ${
            type === "task" ? "bg-sky-600 hover:bg-sky-700" : "bg-amber-600 hover:bg-amber-700"
          }`}
        >
          Post
        </button>
      </form>
    </WorkItemSection>
  );
}
