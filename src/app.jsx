import { render, Component } from 'inferno';
import LocalCall from './LocalCall.jsx';
import RemoteCall from './RemoteCall.jsx';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <div>
                <div class="Header"></div>
                <LocalCall />
            </div>
        )
    }
}

render(
  <App />,
  document.getElementById("app")
);
