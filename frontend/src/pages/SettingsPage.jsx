import AuthGuard from "components/Auth/AuthGuard";
import SettingsBlock from "components/Settings/SettingsBlock";
import UsersBlock from "components/Settings/UsersBlock";
import { useAuth } from "utils/useAuth";



export default function SettingsPage() {

  const {user} = useAuth()
  const status = user?.status !== 1

  return (
    <AuthGuard>
      <SettingsBlock readonly={status} />
      <UsersBlock readonly={status}  />
    </AuthGuard>
  );
}