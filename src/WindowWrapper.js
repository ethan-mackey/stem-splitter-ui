export default function WindowWrapper({ children, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        position: "relative",
        display: "inline-block", // <<< only as big as its kids
        WebkitAppRegion: "drag",
      }}
    >
      {children}
    </div>
  );
}
