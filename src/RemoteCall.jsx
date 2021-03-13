import { Component } from 'inferno';


class RemoteCall extends Component {
    constructor(props) {
        super(props);
        this.state = {
            remoteBlob: '',
        };
    }

    render() {
        return (
            <div>
                <h2 class="h2">Remote Call</h2>
                <video id="remote_video" controls autoplay style={{width: '600px'}}></video>
                <br />
                <input type="button" value="Connect Remote" disabled={this.state.started} onclick={this._startCall.bind(this)} />
                <br />
                <textarea></textarea>
            </div>
        )
    }
}

export default RemoteCall;
