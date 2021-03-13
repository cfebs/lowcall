import { render, Component } from 'inferno';
import LocalCall from 'LocalCall';
import RemoteCall from 'RemoteCall';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <div>
                <LocalCall />
                <RemoteCall />
            </div>
        )
    }
}

render(
  <App />,
  document.getElementById("app")
);
