import { clientLogoutBroadcast } from "utils/functions";


export default function ExitPage(){

    //const { setUser } = useAuth();
    clientLogoutBroadcast();
    //setUser(null);          // мгновенно скрываем защищённый контент
    window.location.href= "/"

}