export const ValidationError = ({
  errorMessage = "",
}: {
  errorMessage: string | null;
}) => <div className="text-xs text-red-500">{errorMessage}</div>;
