import React from "react";

import{Register,Login, Profile} from "./ProfileContent";
import TrendGraphsContent from "./TrendGraphsContent";
import AdviceContent from "./AdviceContent";
import SettingsContent from "./SettingsContent";
import HelpContent from "./HelpContent";
import HomeContent from "./HomeContent";

export default function ActiveContent({ id }) {
  switch (id) {
    case "home": return <HomeContent />;
    case "profile": return <Profile/>;
    case "login": return <Login />;
    case "register": return <Register />;
    case "settings": return <SettingsContent />;
    case "advice": return <AdviceContent />;
    case "trendGraphs": return <TrendGraphsContent />;
    case "help": return <HelpContent />;
    default:
      return <div>Select an option to continue.</div>;
  }
}
