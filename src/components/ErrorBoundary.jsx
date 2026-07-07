import { Component } from 'react';
import AppIcon from './AppIcon';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App crashed', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error">
          <div className="card app-error-card">
            <div className="empty-state">
              <div className="empty-icon"><AppIcon name="alert" size={44} /></div>
              <h2>Có lỗi xảy ra</h2>
              <p>Ứng dụng gặp lỗi khi tải trang này. Vui lòng tải lại trang để thử lại.</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
