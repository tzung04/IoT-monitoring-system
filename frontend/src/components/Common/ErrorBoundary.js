import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Store error & info in state and log to console
    this.setState({ error, info });
    console.error('ErrorBoundary caught error:', error, info);

    // Optional: send error to remote logging endpoint
    // fetch('/error-collect', { method: 'POST', body: JSON.stringify({ error: String(error), info }) });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20 }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {String(this.state.error)}
            <br />
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
