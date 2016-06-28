package main

import (
	"errors"
	"fmt"
	"github.com/apex/log"
	"github.com/apex/log/handlers/text"
	"github.com/labstack/echo"
	"github.com/labstack/echo/engine/standard"
	"github.com/labstack/echo/middleware"
	"github.com/nats-io/nats"
	"github.com/satori/go.uuid"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
)

const DefaultLocation = "/tmp/%s"

type Job struct {
	fileType  string
	email     string
	filenames []string
}

func upload(c echo.Context) error {
	// Read form fields
	email := c.FormValue("email")
	fileType := c.FormValue("fileType")

	filenames := []string{}

	//------------
	// Read files
	//------------

	// Multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return err
	}
	files := form.File["files"]

	for _, file := range files {
		// Source
		src, err := file.Open()
		if err != nil {
			return err
		}
		defer src.Close()

		filename := file.Filename
		filenames = append(filenames, filename)

		input := fmt.Sprintf(DefaultLocation, filename)
		// Destination
		dst, err := os.Create(input)
		if err != nil {
			return err
		}
		defer dst.Close()

		if _, err = io.Copy(dst, src); err != nil {
			return err
		}
	}

	job := &Job{
		email:     email,
		fileType:  fileType,
		filenames: filenames,
	}

	log.Infof("Job: %v", job)

	channel.Publish("generation", job)

	return c.HTML(http.StatusOK, fmt.Sprintf("<p>Uploaded successfully %d files with fields email=%s.</p>", len(files), email))
}

func (job Job) application() (string, error) {
	if job.fileType == "fbx" {
		return "/home/deploy/Support/bin/convert_to_fbx.py", nil
	} else if job.fileType == "obj" {
		return "/home/deploy/Support/bin/convert_to_obj.py", nil
	} else {
		return "", errors.New("We can't process this job because of unknown format")
	}
}

func (job Job) process() {
	for _, filename := range job.filenames {
		input := fmt.Sprintf(DefaultLocation, filename)

		var ext = filepath.Ext(input)
		u1 := uuid.NewV4()
		output := input[0:len(input)-len(ext)] + "-" + u1.String() + "." + job.fileType

		logger := log.WithField("input", input).WithField("email", job.email).WithField("output", output)
		logger.Info("Begin processing")

		application, err := job.application()
		if err != nil {
			logger.WithError(err).Error("can't find application by requested type")
			return
		}

		arguments := []string{application, "-o", output, input}

		c := exec.Command("/usr/bin/python", arguments...)
		c.Env = os.Environ()

		_, err = c.Output()
		if err != nil {
			logger.Error("error on run convert utility")
			return
		}
		if _, err = os.Stat(output); os.IsNotExist(err) {
			logger.Error("file no exists after convert")
			return
		}

		go job.sendEmail(filename, output)

		logger.Info("Done processing")
	}
}

const DefaultEmail = "alex.korsak@gmail.com"

func (job Job) sendEmail(filename string, outputPath string) {
	logger := log.WithField("filename", filename).WithField("email", job.email)
	defer os.Remove(outputPath)

	arguments := []string{
		DefaultEmail,
		"-a", outputPath,
		"-s", fmt.Sprintf("'Converted File %s'", filename),
		"-e", fmt.Sprintf("'my_hdr From:%s'", DefaultEmail),
	}

	c := exec.Command("/usr/bin/mutt", arguments...)
	c.Env = os.Environ()

	output, err := c.Output()
	if err != nil {
		logger.WithError(err).Errorf("error on send email: %s", output)
		return
	}
}

var (
	publicFolder string
	port         string
)

func setup() {
	if publicFolder = os.Getenv("SERVER_PUBLIC_FOLDER"); publicFolder == "" {
		publicFolder = "/home/deploy/public"
	}

	if port = os.Getenv("SERVER_PORT"); port == "" {
		port = ":80"
	}
}

var nc *nats.Conn
var channel *nats.EncodedConn

func main() {
	setup()

	nc, _ := nats.Connect(nats.DefaultURL)
	defer nc.Close()

	channel, _ := nats.NewEncodedConn(nc, nats.JSON_ENCODER)
	defer channel.Close()

	log.SetHandler(text.New(os.Stderr))
	log.SetLevel(log.DebugLevel)

	// Simple Async Subscriber
	channel.Subscribe("generation", func(job *Job) {
		log.Infof("Received message to process job %v", job)
		job.process()
	})

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.Static(publicFolder))

	e.POST("/upload", upload)
	e.Run(standard.New(port))
}
