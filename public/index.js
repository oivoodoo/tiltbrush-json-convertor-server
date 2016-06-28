import React from 'react';
import ReactDOM from 'react-dom';
import Dropzone from 'react-dropzone';
import request from 'superagent';

class Footer extends React.Component {
    render() {
        return (
            <section id="footer">
                <ul className="icons">
                    <li><a href="https://www.facebook.com/groups/TiltBrushArtists/" className="icon fa-facebook"><span className="label">Facebook</span></a></li>
                </ul>
                <div className="copyright">
                    <ul className="menu">
                        <li>&copy; Alexandr & <a href="mailto:alex.korsak@gmail.com">Alexandr</a> | All rights reserved.</li>
                    </ul>
                </div>
            </section>
        );
    }
}

class HeaderForm extends React.Component {
    render() {
        return (
          <header>
            <h2>Convert files to FBX, OBJ</h2>
            <p>Please choose the files to convert to specified file format then
            you will receive email with processed files.</p>
          </header>
        )
    }
}

class FilesList extends React.Component {
    render () {
      let files = this.props.files;

      if (typeof(files) !== 'undefined' && files.length > 0) {
          return (
              <div>
                  <h2>Files({files.length})</h2>
                  <ul>
                      {files.map((file, i) => <li key={i}>{file.name}</li>)}
                  </ul>
              </div>
          );
      }

      return null;
    }
}

class FilesDropZone extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.className = "files-dropzone";
        this.state = {
            files: props.files
        };
    }

    onDrop = (files) => {
      this.setState({
        files: files
      });

      this.props.setFiles(files);
    }

    // onOpenClick = () => {
    //     this.refs.dropzone.open();
    // }

    render() {
      return (
          <div>
            <Dropzone onDrop={this.onDrop} className={this.className}>
                <div>Drop files here.</div>
            </Dropzone>
            <FilesList files={this.state.files}/>
          </div>
      );
    }
}


// <div className="center-button-wrapper">
//     <button type="button" onClick={this.onOpenClick} className="">
//         Open Dropzone
//     </button>
// </div>

class Form extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.className = "files-dropzone";
        this.state = {
            fileType: "fbx",
            email: "",
            processing: false,
        }
        this.files = [];
    }

    handleChange(e, field) {
        let state = {};
        state[field] = e.target.value;
        this.setState(state);
    }

    setFiles = (files) => {
        this.files = files;
    }

    handleSubmit(e) {
      e.preventDefault();

      if (this.files.length === 0) {
          return
      }

      this.setState({
          processing: true
      });

      var req = request
          .post('/upload')
          .field('email', this.state.email)
          .field('fileType', this.state.fileType);
      this.files.forEach((file)=> {
          req.attach('files', file, file.name);
      });
      var context = this;
      req.end(() => {
          context.setState({
              processing: false,
          });
          context._zone.setState({
              files: [],
          });
      });
    }

    render() {
        return (
          <form method="post" action="/upload" onSubmit={this.handleSubmit.bind(this)}>
            <div className="row 50%">
              <div className="6u 12u$(mobile)">
                  <input type="email" className="text" name="email" placeholder="Email" onChange={((e) => this.handleChange(e, 'email')).bind(this)} required />
              </div>
              <div className="6u$ 12u$(mobile)">
                <select name="fileType" placeholder="Choose" onChange={((e) => this.handleChange(e, 'fileType')).bind(this)} >
                  <option value="fbx">FBX</option>
                  <option value="obj">OBJ</option>
                </select>
              </div>
              <div className="12u$">
                <FilesDropZone ref={(c) => this._zone = c} setFiles={this.setFiles}/>
              </div>
              <div className="12u$">
                <ul className="actions">
                  <li><input type="submit" value="Convert!"  disabled={this.state.processing} /></li>
                  { this.state.processing ? <img width="32" height="32" alt="star" src="images/loading.gif" /> : null }
                </ul>
              </div>
            </div>
          </form>
        )
    }
}

class FormContainer extends React.Component {
    render() {
        return (
            <article className="container box style3">
                <HeaderForm />
                <Form />
            </article>
        )
    }
}

class Container extends React.Component {
    render() {
        return (
            <div className='form-container'>
                <FormContainer />
                <Footer />
            </div>
        )
    }
}

ReactDOM.render(
    <Container />,
    document.getElementById('root')
);
