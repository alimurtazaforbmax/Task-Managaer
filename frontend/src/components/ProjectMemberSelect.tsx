import MultiUserSelect from "./MultiUserSelect";
import type { User } from "../types";

interface Props {
  users: User[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function ProjectMemberSelect({ users, selected, onChange }: Props) {
  return (
    <MultiUserSelect
      label="Project members"
      users={users}
      selected={selected}
      onChange={onChange}
    />
  );
}
