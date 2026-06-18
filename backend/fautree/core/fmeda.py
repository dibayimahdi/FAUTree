from __future__ import annotations

from dataclasses import dataclass

from .model import FaultTreeProject


@dataclass(frozen=True)
class FmedaSummary:
    lambda_sd: float
    lambda_su: float
    lambda_dd: float
    lambda_du: float
    lambda_annunciation: float
    lambda_no_effect: float
    lambda_spf: float
    lambda_rf: float
    lambda_mpf: float
    lambda_latent_mpf: float
    row_count: int

    @property
    def lambda_safe(self) -> float:
        return self.lambda_sd + self.lambda_su

    @property
    def lambda_dangerous(self) -> float:
        return self.lambda_dd + self.lambda_du

    @property
    def lambda_total(self) -> float:
        return self.lambda_safe + self.lambda_dangerous + self.lambda_annunciation + self.lambda_no_effect

    @property
    def lambda_safety_related(self) -> float:
        return self.lambda_safe + self.lambda_dangerous

    @property
    def dangerous_diagnostic_coverage(self) -> float:
        dangerous = self.lambda_dangerous
        if dangerous <= 0:
            return 0.0
        return self.lambda_dd / dangerous

    @property
    def spfm(self) -> float:
        if self.lambda_total <= 0:
            return 0.0
        return 1.0 - ((self.lambda_spf + self.lambda_rf) / self.lambda_total)

    @property
    def lfm(self) -> float | None:
        if self.lambda_mpf <= 0 or self.lambda_latent_mpf <= 0:
            return None
        return 1.0 - (self.lambda_latent_mpf / self.lambda_mpf)

    @property
    def pmhf(self) -> float:
        return self.lambda_du

    @property
    def sff(self) -> float:
        if self.lambda_safety_related <= 0:
            return 0.0
        return (self.lambda_sd + self.lambda_su + self.lambda_dd) / self.lambda_safety_related

    def to_dict(self) -> dict[str, float | int]:
        return {
            "rowCount": self.row_count,
            "lambdaSD": self.lambda_sd,
            "lambdaSU": self.lambda_su,
            "lambdaDD": self.lambda_dd,
            "lambdaDU": self.lambda_du,
            "lambdaAnnunciation": self.lambda_annunciation,
            "lambdaNoEffect": self.lambda_no_effect,
            "lambdaSafe": self.lambda_safe,
            "lambdaDangerous": self.lambda_dangerous,
            "lambdaSafetyRelated": self.lambda_safety_related,
            "lambdaTotal": self.lambda_total,
            "dangerousDiagnosticCoverage": self.dangerous_diagnostic_coverage,
            "lambdaSPF": self.lambda_spf,
            "lambdaRF": self.lambda_rf,
            "lambdaMPF": self.lambda_mpf,
            "lambdaLatentMPF": self.lambda_latent_mpf,
            "spfm": self.spfm,
            "lfm": self.lfm,
            "pmhf": self.pmhf,
            "sff": self.sff,
        }


def compute_fmeda_summary(project: FaultTreeProject) -> FmedaSummary:
    return FmedaSummary(
        lambda_sd=sum(row.lambda_sd for row in project.fmea),
        lambda_su=sum(row.lambda_su for row in project.fmea),
        lambda_dd=sum(row.lambda_dd for row in project.fmea),
        lambda_du=sum(row.lambda_du for row in project.fmea),
        lambda_annunciation=sum(row.lambda_annunciation for row in project.fmea),
        lambda_no_effect=sum(row.lambda_no_effect for row in project.fmea),
        lambda_spf=sum(row.lambda_spf for row in project.fmea),
        lambda_rf=sum(row.lambda_rf for row in project.fmea),
        lambda_mpf=sum(row.lambda_mpf for row in project.fmea),
        lambda_latent_mpf=sum(row.lambda_latent_mpf for row in project.fmea),
        row_count=len(project.fmea),
    )
