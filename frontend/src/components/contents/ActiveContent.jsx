import React from "react";

import ProfileContent from "./ProfileContent";
import IncomeContent from "./IncomeContent";
import ExpenseContent from "./ExpenseContent";
import GraphsContent from "./GraphsContent";
import TrendGraphsContent from "./TrendGraphsContent";
import AdviceContent from "./AdviceContent";
import SettingsContent from "./SettingsContent";
import HelpContent from "./HelpContent";
import HomeContent from "./HomeContent";

export default function ActiveContent({ id }) {
  switch (id) {
    case "home": return <HomeContent />;
    case "profile": return <ProfileContent />;
    case "settings": return <SettingsContent />;
    case "advice": return <AdviceContent />;
    case "income": return <IncomeContent />;
    case "expense": return <ExpenseContent />;
    case "graphs": return <GraphsContent />;
    case "trendGraphs": return <TrendGraphsContent />;
    case "help": return <HelpContent />;
    default:
      return <div>Select an option to continue.</div>;
  }
}
