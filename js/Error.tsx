import React from 'react';
import type {ReactNode} from 'react';

export function Err({children}: {children: ReactNode}) {
  console.error(children);
  return <span className="error">{children}</span>;
}

export class ErrorBoundary extends React.Component<{}, {error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = {error: null};
  }

  static getDerivedStateFromError(error: Error) {
    return {error};
  }

  // componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
  //   // could try to report the error here.
  //   // (no point using console.error though because React already did)
  // }

  render() {
    if (this.state.error) {
      return <p>{`Error: ${this.state.error}`}</p>;
    }

    return this.props.children;
  }
}
