
import React from "react";

export {ErrorBoundary}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: null};
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.

    return { hasError: true, message: error.message , stack: error.stack};
  }


  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      let style = {"display": "inline-block", marginTop: 25}
      let the_message = `<pre>${this.state.message}\n${this.state.stack})</pre>`
      let content_dict = {__html: the_message};
      return (
          <div className="data-box" style={style}  dangerouslySetInnerHTML={content_dict}/>
      );
    }

    return this.props.children;
  }
}

// function mapStateToProps(state, ownProps){
//     return ownProps
// }
//
// function mapDispatchToProps(dispatch) {
//   return {}
// }
//
// var ErrorBoundary = connect(mapStateToProps, mapDispatchToProps)(ErrorBoundaryRaw)