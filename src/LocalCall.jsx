import { Component } from 'inferno';
import * as Pako from 'pako';

const USER_TYPE_START = Symbol('start')
const USER_TYPE_RECV = Symbol('recv')

class LocalCall extends Component {
    constructor(props) {
        super(props);
        this.conn = null;
        this.state = {
            user_type: null,
            connectBlob: null,

            started: false,
            videoSrc: null,
            offer: null,
            ice: [],
        };

        this.startCall = this._startCall.bind(this);
    }

    async _startCall() {
        this.setState({ started: true })

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
        stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

        stream.getTracks().forEach(track => this.conn.addTrack(track, stream));
        // TODO this doesn't work
        this.setState({ videoSrc: stream });
        // TODO inferno way of doing this?
        document.querySelector('#local_video').srcObject = stream;

        // user starting the call and creating the offer
        if (this.state.user_type === USER_TYPE_START && !this.state.offer) {
            const offer = await this.conn.createOffer()
            this.conn.setLocalDescription(offer);
            this.setState({offer: offer})
        }
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
        if (!this.state.user_type) {
            return (
                <div>
                    <p>Are you starting or receiving a call?</p>
                    <button onclick={() => this.setState({ user_type: USER_TYPE_START })}>
                        Starter
                    </button>
                    <br />
                    <button onclick={() => this.setState({ user_type: USER_TYPE_RECV })}>
                        Receiver
                    </button>
                </div>
            )
        }

        if (this.state.user_type === USER_TYPE_START) {
            if (this.state.offer && this.state.ice.length > 0) {
                if (!this.state.connectBlob) {
                    const connectData = {
                        offer: this.state.offer,
                        ice: this.state.ice,
                    };

                    let connectBlob = JSON.stringify(connectData);
                    connectBlob = Pako.deflate(JSON.stringify(connectBlob));
                    connectBlob = window.btoa(connectBlob);
                    this.setState({connectBlob});
                }
            }

            return (
                <div>
                    <h2 class="h2">Local Call</h2>
                    <video id="local_video" controls autoplay style={{width: '400px'}}></video>
                    <br />
                    <input type="button" value="Start capture"
                        onclick={this.startCall} />
                    <br />
                    {this.state.connectBlob && <div>
                        <p>Send this too your peer</p>
                        <textarea>{this.state.connectBlob}</textarea>
                    </div>}
                </div>
            )
        }

        return (
            <div>
                <div>
                    <h2 class="h2">Remote Call</h2>
                    <video id="remote_video" controls autoplay style={{width: '400px'}}></video>
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
