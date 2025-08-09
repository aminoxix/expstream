export const TeamChannelPreview = ({ name }: { name: string }) => (
  <div className="text-sm" title={name}>
    <p>{`# ${name}`}</p>
  </div>
);
