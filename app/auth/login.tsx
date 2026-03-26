export default function LoginPage() {
    const handleLogin = () => {
      // Add your login logic here
      console.log("Login clicked");
    };
  
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <button onClick={handleLogin} style={{ padding: "12px 32px", fontSize: "16px", cursor: "pointer" }}>
          Login
        </button>
      </div>
    );
  }