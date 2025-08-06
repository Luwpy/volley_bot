{
  description = "RPG de Vôlei - Discord Bot + Web Frontend";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Runtime
            bun
            nodejs_20

            # Prisma tools
            prisma-engines

            openssl
          ];

          shellHook = ''
            echo "🏐 RPG de Vôlei Development Environment"
            echo "====================================="
            echo "Bun: $(bun --version)"
            echo "Podman: $(podman --version)"
            echo ""

            # Prisma environment variables
            export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
            export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
            export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
            export PRISMA_FMT_BINARY="${pkgs.prisma-engines}/bin/prisma-fmt"


            echo "Environment ready! Use 'podman' for database management."
          '';
        };

        formatter = pkgs.alejandra;
      }
    );
}
