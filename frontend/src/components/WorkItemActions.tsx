function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

interface WorkItemActionsProps {
  readonly editLabel: string;
  readonly itemTitle: string;
  readonly isEditing?: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly deletePending?: boolean;
}

export default function WorkItemActions({
  editLabel,
  itemTitle,
  isEditing = false,
  onEdit,
  onDelete,
  deletePending = false,
}: WorkItemActionsProps) {
  const handleDelete = () => {
    if (
      globalThis.confirm(
        `Delete "${itemTitle}"? This cannot be undone.`
      )
    ) {
      onDelete();
    }
  };

  return (
    <div className="flex gap-3 shrink-0">
      <button
        type="button"
        onClick={onEdit}
        aria-pressed={isEditing}
        className={`inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
          isEditing
            ? "bg-brand-700 text-white hover:bg-brand-700/90"
            : "bg-brand-600 text-white hover:bg-brand-700"
        }`}
      >
        <EditIcon />
        {editLabel}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deletePending}
        className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition-colors hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <TrashIcon />
        {deletePending ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
