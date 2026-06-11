import { useEffect, useMemo, useState } from "react";
import SearchInput from "./SearchInput";
import UserAvatar from "./UserAvatar";
import { useUserSearch } from "../hooks/useUserSearch";
import { formatRoleLabel, MEMBER_ROLE_STYLES } from "../utils/projectStyle";
import type { User } from "../types";

interface Props {
  readonly selected: number[];
  readonly onChange: (ids: number[]) => void;
  readonly initialUsers?: User[];
}

function getUserDisplayName(user: User): string {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return name || user.username;
}

function getUserRoleLabel(user: User): string {
  return user.access_role_name ?? formatRoleLabel(user.role);
}

export default function ProjectMemberSelect({
  selected,
  onChange,
  initialUsers = [],
}: Props) {
  const [search, setSearch] = useState("");
  const [userCache, setUserCache] = useState<Map<number, User>>(new Map());

  const { data: searchData, isLoading: searchLoading } = useUserSearch(search);

  useEffect(() => {
    if (!initialUsers.length) return;
    setUserCache((prev) => {
      const next = new Map(prev);
      for (const user of initialUsers) next.set(user.id, user);
      return next;
    });
  }, [initialUsers]);

  const selectedUsers = useMemo(
    () =>
      selected
        .map((id) => userCache.get(id))
        .filter((u): u is User => Boolean(u)),
    [selected, userCache]
  );

  const availableUsers = useMemo(() => {
    const selectedSet = new Set(selected);
    return (searchData?.results ?? [])
      .filter((u) => !selectedSet.has(u.id))
      .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b)));
  }, [searchData?.results, selected]);

  const addMember = (user: User) => {
    setUserCache((prev) => new Map(prev).set(user.id, user));
    if (!selected.includes(user.id)) onChange([...selected, user.id]);
  };

  const removeMember = (id: number) => {
    onChange(selected.filter((x) => x !== id));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Project members</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selected.length} selected · members can access tasks, bugs, and tickets
            </p>
          </div>
        </div>
        <div className="mt-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, role, or department…"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Selected ({selected.length})
          </p>
          {selected.length === 0 ? (
            <p className="text-sm text-slate-400 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center">
              No members selected yet. Search and add people from the list.
            </p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedUsers.map((user) => {
                const roleLabel = getUserRoleLabel(user);
                const roleStyle =
                  MEMBER_ROLE_STYLES[user.role ?? ""] ?? "bg-slate-100 text-slate-700";
                return (
                  <li
                    key={user.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <UserAvatar
                      name={getUserDisplayName(user)}
                      photoUrl={user.profile_picture_url}
                      seed={user.id}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {getUserDisplayName(user)}
                      </p>
                      <p className="text-xs text-slate-500 truncate">@{user.username}</p>
                    </div>
                    <span
                      className={`hidden sm:inline shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roleStyle}`}
                    >
                      {roleLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMember(user.id)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      aria-label={`Remove ${getUserDisplayName(user)}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                );
              })}
              {selected.length > selectedUsers.length && (
                <li className="text-xs text-slate-400 px-2">
                  {selected.length - selectedUsers.length} selected member(s) not shown — search to view details.
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="p-4 bg-white/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Add members
          </p>
          {searchLoading ? (
            <p className="text-sm text-slate-400 py-4">Searching users…</p>
          ) : availableUsers.length === 0 ? (
            <p className="text-sm text-slate-400 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center">
              {search.trim()
                ? "No users match your search."
                : "Type a name or email to find users to add."}
            </p>
          ) : (
            <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {availableUsers.map((user) => {
                const roleLabel = getUserRoleLabel(user);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => addMember(user)}
                      className="w-full flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left hover:border-brand-200 hover:bg-brand-50/60 transition group"
                    >
                      <UserAvatar
                        name={getUserDisplayName(user)}
                        photoUrl={user.profile_picture_url}
                        seed={user.id}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate group-hover:text-brand-800">
                          {getUserDisplayName(user)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {[user.email, user.department_name, roleLabel]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition">
                        Add
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
