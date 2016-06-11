release:
	@echo "[+] re-generating"
	@go generate ./...
	@echo "[+] building"
	@$(MAKE) build
	@echo "[+] complete"
.PHONY: release

test:
	@go test -v -cover ./...
.PHONY: test

build:
	@gox -os="linux" ./...
	@mv server_* bin/
.PHONY: build

clean:
	@git clean -f
.PHONY: clean
