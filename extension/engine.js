// CF-Police JavaScript Math Engine

// Erf approximation for normal CDF
function erf(x) {
    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}

function normCdf(x) {
    return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)));
}

function determineBand(rating) {
    if (rating < 800) return 'B0';
    if (rating < 1200) return 'B1';
    if (rating < 1600) return 'B2';
    if (rating < 2000) return 'B3';
    if (rating < 2400) return 'B4';
    if (rating < 2700) return 'B5';
    return 'B6';
}

function getAnomalyIntensity(featureName, pct) {
    if (featureName === 'scrs') return pct;
    
    if (['smr', 'pcri', 'vts'].includes(featureName)) {
        return Math.max(0, 1.0 - (pct / 0.15));
    }
    
    return Math.max(0, (pct - 0.85) / 0.15);
}

const FEATURE_WEIGHTS = {
    'smr': 0.20,
    'sts': 0.22,
    'pcri': 0.18,
    'scrs': 0.10,
    'rrmi': 0.10,
    'vts': 0.08,
    'wahr': 0.05,
    'rss': 0.04,
    'mds': 0.03
};

function computeAnomalyScore(featurePercentiles, guardrailPenalty) {
    const featuresPresent = Object.keys(featurePercentiles);
    if (featuresPresent.length === 0) return {score: 0, conf: 0, label: "Insufficient Data"};

    let totalWeight = 0;
    for (const f of featuresPresent) {
        if (FEATURE_WEIGHTS[f]) totalWeight += FEATURE_WEIGHTS[f];
    }

    if (totalWeight === 0) return {score: 0, conf: 0, label: "Insufficient Data"};

    let rawScore = 0.0;
    for (const f of featuresPresent) {
        if (FEATURE_WEIGHTS[f]) {
            const effWeight = FEATURE_WEIGHTS[f] / totalWeight;
            const intensity = getAnomalyIntensity(f, featurePercentiles[f]);
            rawScore += effWeight * intensity;
        }
    }

    let finalScore = (rawScore * 5.0) + guardrailPenalty;
    finalScore = Math.min(5.0, finalScore);
    const confidencePct = (featuresPresent.length / Object.keys(FEATURE_WEIGHTS).length) * 100.0;

    let label = "Likely Genuine";
    if (guardrailPenalty >= 2.0) label = "Highly Anomalous";
    else if (finalScore >= 4.0) label = "Most Probably Cheated";
    else if (finalScore >= 3.0) label = "Maybe Cheated";
    else if (finalScore >= 2.0) label = "Suspicious";

    return { score: finalScore, conf: confidencePct, label: label };
}

function evaluateUser(handle, ratingHistory, statusHistory, baseline) {
    let guardrailPenalty = 0.0;
    
    const sixMonthsAgo = Date.now() / 1000 - 180 * 24 * 60 * 60;
    
    // --- Parse History ---
    let maxDelta = 0;
    for (const c of ratingHistory) {
        if (c.ratingUpdateTimeSeconds > sixMonthsAgo) {
            const delta = c.newRating - c.oldRating;
            if (delta > maxDelta) maxDelta = delta;
        }
    }

    let contestMaxDiff = 0;
    let virtualMaxDiff = 0;
    let totalProblemsSolved = 0;
    let maxDiffJump = 0;
    let historicalMaxDiff = 0;
    let solvedProblems = new Set();
    
    const chronologicalSubs = [...statusHistory].reverse();
    
    for (const sub of chronologicalSubs) {
        const author = sub.author || {};
        const ptype = author.participantType || '';
        if (ptype !== 'CONTESTANT' && ptype !== 'OUT_OF_COMPETITION' && ptype !== 'VIRTUAL') continue;

        if (sub.verdict === 'OK') {
            const prob = sub.problem || {};
            const pid = `${prob.contestId || ''}${prob.index || ''}`;
            if (!solvedProblems.has(pid)) {
                solvedProblems.add(pid);
                totalProblemsSolved += 1;
                
                let diff = prob.rating || 0;
                
                // Live Contest Difficulty Estimator
                if (diff === 0 && prob.points) {
                    if (prob.points >= 2500) diff = 2100;
                    else if (prob.points >= 2000) diff = 1800;
                    else if (prob.points >= 1500) diff = 1500;
                    else if (prob.points >= 1000) diff = 1100;
                    else if (prob.points >= 500) diff = 800;
                }
                if (diff === 0 && prob.index) {
                    const char = prob.index.charAt(0).toUpperCase();
                    if (char === 'D') diff = 1400;
                    if (char === 'E') diff = 1600;
                    if (char === 'F') diff = 1800;
                    if (char === 'G') diff = 2000;
                    if (char === 'H') diff = 2200;
                    if (char === 'I') diff = 2400;
                }
                
                if (diff > virtualMaxDiff) virtualMaxDiff = diff;
                if (ptype !== 'VIRTUAL' && diff > contestMaxDiff && sub.creationTimeSeconds > sixMonthsAgo) {
                    contestMaxDiff = diff;
                }
                
                if (ptype !== 'VIRTUAL') {
                    if (historicalMaxDiff > 0) {
                        const jump = diff - historicalMaxDiff;
                        if (jump > maxDiffJump && sub.creationTimeSeconds > sixMonthsAgo) {
                            maxDiffJump = jump;
                        }
                    }
                    if (diff > historicalMaxDiff) {
                        historicalMaxDiff = diff;
                    }
                }
            }
        }
    }

    // --- Guardrails ---
    // 1: Sudden Rank Jump
    if (ratingHistory.length >= 6) {
        let maxRankJump = 0;
        for (let i = 5; i < ratingHistory.length; i++) {
            if (ratingHistory[i].ratingUpdateTimeSeconds > sixMonthsAgo) {
                const prevRanks = ratingHistory.slice(i-5, i).map(c => c.rank).filter(r => r > 0);
                if (prevRanks.length > 0) {
                    const avgPast = prevRanks.reduce((a, b) => a + b, 0) / prevRanks.length;
                const curRank = ratingHistory[i].rank || 0;
                const oldRating = ratingHistory[i].oldRating || 0;
                
                // Rank jumps are meaningless across different divisions and for established players.
                // A Grandmaster getting rank 16000 in Div 3 and then rank 10 in Div 1 is just trolling.
                // We only flag if an unrated/low-rated user suddenly places in the absolute Top 100 of a contest.
                if (curRank > 0 && curRank <= 100 && oldRating < 1600) {
                    const jump = avgPast - curRank;
                    if (jump > maxRankJump) maxRankJump = jump;
                }
            }
            } // Close if (ratingHistory[i].ratingUpdateTimeSeconds > sixMonthsAgo)
        }
        if (maxRankJump >= 4000) {
            guardrailPenalty = Math.max(guardrailPenalty, Math.min(5.0, (maxRankJump - 4000) / 500.0));
        }
    }

    // 2: Sudden Difficulty Jump
    if (maxDiffJump >= 800) {
        guardrailPenalty = Math.max(guardrailPenalty, Math.min(3.0, (maxDiffJump - 800) / 200.0));
    }

    // 3: Unrealistic Growth (Speedrun)
    if (ratingHistory.length >= 3 && ratingHistory.length <= 15) {
        let startIndex = 0;
        if (ratingHistory[0].oldRating === 0) {
            startIndex = 1; // Skip the first placement match where rating artificially jumps from 0
        }
        
        if (ratingHistory.length - startIndex >= 2) {
            const firstOldRating = ratingHistory[startIndex].oldRating || 0;
            const currentRating = ratingHistory[ratingHistory.length - 1].newRating || 0;
            const firstContestTime = ratingHistory[startIndex].ratingUpdateTimeSeconds || 0;
            
            // Guardrail 3 natively checks ratingHistory.length <= 15, so it already only applies to smurfs/speedrunners.
            // We do NOT need a time decay here, otherwise dormant smurfs (created years ago but barely played) bypass it!
            if (currentRating > firstOldRating) {
                const numContests = ratingHistory.length - startIndex;
                const avgGain = (currentRating - firstOldRating) / numContests;
                if (avgGain >= 150) {
                    guardrailPenalty = Math.max(guardrailPenalty, Math.min(4.0, (avgGain - 150) / 30.0));
                }
            }
        }
    }

    // Calculate max historical rating to prevent punishing players who had a rating drop
    let maxHistoricalRating = 1500;
    for (const c of ratingHistory) {
        if (c.newRating > maxHistoricalRating) maxHistoricalRating = c.newRating;
    }

    // 4: Out of League
    if (ratingHistory.length > 0) {
        if (maxHistoricalRating > 0 && maxHistoricalRating < 1600) {
            const effRating = Math.max(maxHistoricalRating, 1000);
            const discrepancy = contestMaxDiff - effRating;
            if (discrepancy >= 600) {
                guardrailPenalty = Math.max(guardrailPenalty, Math.min(5.0, (discrepancy - 600) / 100.0));
            }
        }
    }

    // 5: Unrated Prodigy
    if (ratingHistory.length === 0) {
        if (virtualMaxDiff >= 1700) {
            guardrailPenalty = Math.max(guardrailPenalty, Math.min(5.0, (virtualMaxDiff - 1600) / 100.0));
        }
    }

    // --- Statistical Engine ---
    const curRatingForBand = maxHistoricalRating;
    function determineBand(rating) {
        if (rating < 1200) return 'B1';
        if (rating < 1600) return 'B2';
        if (rating < 2000) return 'B3';
        if (rating < 2400) return 'B4';
        return 'B5';
    }
    const band = determineBand(curRatingForBand);
    const distMap = baseline[band] || {};

    const contestsTaken = ratingHistory.length;
    let featurePercentiles = {};

    // SMR (Speed to Milestone Ratio)
    if (distMap['smr_contests'] && distMap['smr_contests'].std_dev > 0) {
        const z = (contestsTaken - distMap['smr_contests'].mean) / distMap['smr_contests'].std_dev;
        featurePercentiles['smr'] = Math.max(0.0, Math.min(1.0, normCdf(z)));
    }

    // SCRS
    if (distMap['scrs_delta'] && distMap['scrs_delta'].p99 != null) {
        const p95 = distMap['scrs_delta'].p95;
        const p99 = distMap['scrs_delta'].p99;
        if (maxDelta <= p95) featurePercentiles['scrs'] = 0.0;
        else if (p99 === p95) featurePercentiles['scrs'] = maxDelta > p95 ? 1.0 : 0.0;
        else {
            let scrs = (maxDelta - p95) / (p99 - p95);
            featurePercentiles['scrs'] = Math.min(Math.max(scrs, 0.0), 1.0);
        }
    }

    // PCRI (Performance Ceiling Rating Increase)
    if (distMap['pcri'] && distMap['pcri'].std_dev > 0) {
        const z = (totalProblemsSolved - distMap['pcri'].mean) / distMap['pcri'].std_dev;
        featurePercentiles['pcri'] = Math.max(0.0, Math.min(1.0, normCdf(z)));
    }

    // MDS (Max Difficulty Solved - previously DJI)
    if (distMap['dji_diff'] && distMap['dji_diff'].std_dev > 0) {
        const z = (contestMaxDiff - distMap['dji_diff'].mean) / distMap['dji_diff'].std_dev;
        featurePercentiles['mds'] = Math.max(0.0, Math.min(1.0, normCdf(z)));
    }

    const res = computeAnomalyScore(featurePercentiles, guardrailPenalty);
    res.featurePercentiles = featurePercentiles;
    res.guardrailPenalty = guardrailPenalty;
    
    return res;
}

window.CFPoliceEngine = {
    evaluateUser: evaluateUser
};
