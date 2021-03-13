import { Component } from 'inferno';

class LocalCall extends Component {
    constructor(props) {
        super(props);
        this.conn = null;
        this.state = {
            started: false,
            videoSrc: null,
            offer: null,
            ice: [],
        };
    }

    async _startCall() {
        this.setState({ started: true })
        console.log('Starting', this);
        this.conn = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ]
        });

        this.conn.onicecandidate = (event) => {
            console.log('OnIce', event);
            if (event.candidate) {
                let iceList = this.state.ice;
                iceList.push(event.candidate);
                this.setState({ice: iceList})
            }
        };

        this.conn.onnegotiationneeded = (event) => {
            console.log('OnNegotiation', event);
        };

        this.conn.ontrack = (event) => {
            console.log('OnTrack', event);
            document.querySelector("remote_video").srcObject = event.streams[0];
        };


        const displayMediaOptions = {
            video: {
                cursor: "always"
            },
            audio: true,
        };

        let stream;
        // stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
        stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

        stream.getTracks().forEach(track => this.conn.addTrack(track, stream));
        // TODO this doesn't work
        this.setState({ videoSrc: stream });

        // TODO inferno way of doing this?
        document.querySelector('#local_video').srcObject = stream;

        const offer = await this.conn.createOffer()
        this.conn.setLocalDescription(offer);
        this.setState({offer: offer})
    }

    async _updateRemote() {
        const remoteBlobEl = document.querySelector('#remote_blob');
        let json = remoteBlobEl.value;

        let parsed = JSON.parse(json);
        console.log('Parsed', parsed);

        const desc = new RTCSessionDescription(parsed.offer);
        let setRemote = await this.conn.setRemoteDescription(desc);
        console.log('SET REMOTE', setRemote);

        parsed.ice.forEach((ice) => {
            const candidate = new RTCIceCandidate(ice);
            this.conn.addIceCandidate(candidate);
        });
    }

    render() {
        const connectData = {
            offer: this.state.offer,
            ice: this.state.ice,
        };

        const connectBlob = JSON.stringify(connectData);

        console.log(connectData);
        return (
            <div>
                <div>
                    <h2 class="h2">Local Call</h2>
                    <video id="local_video" controls autoplay style={{width: '600px'}}></video>
                    <br />
                    <input type="button" value="Start Call" disabled={this.state.started} onclick={this._startCall.bind(this)} />
                    <br />
                    <textarea>{connectBlob}</textarea>
                </div>
                <div>
                    <h2 class="h2">Remote Call</h2>
                    <video id="remote_video" controls autoplay style={{width: '600px'}}></video>
                    <br />
                    <input type="button" value="Connect Remote" onclick={this._updateRemote.bind(this)} />
                    <br />
                    <textarea id="remote_blob"></textarea>
                </div>
            </div>
        )
    }
}

export default LocalCall;
