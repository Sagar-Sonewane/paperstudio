import ReactDOM from "react-dom/client";

function App() {
  return (
    <div>
      <h1>PaperStudio</h1>
      <p>Question paper creator and designer for teachers and coaching institutes.</p>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
