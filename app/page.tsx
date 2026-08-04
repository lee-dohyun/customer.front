import { BlueprintCorners } from "@posselect/ui";

export default function Home() {
  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 32 }}>
      <div className="card blueprint elev-sm" style={{ textAlign: "center" }}>
        <BlueprintCorners />
        <h2 style={{ marginBottom: 8 }}>posselect</h2>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          로그인하거나 새 계정을 만들어보세요.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <a href="/login" className="btn btn-primary blueprint">
            <BlueprintCorners />
            로그인
          </a>
          <a href="/signup" className="btn btn-secondary blueprint">
            <BlueprintCorners />
            회원가입
          </a>
        </div>
      </div>
    </div>
  );
}
