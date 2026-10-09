import type { Dataset } from './types';
import type { WorkflowId } from './open-workflows';
import { WORKFLOWS } from './open-workflows.ts';
import { fingerprint } from './advanced.ts';

export const OPEN_ENGINE_VERSION = 'open-r-1.1.0';
export interface OpenSpec {
  workflow: WorkflowId; outcome: string; predictors: string[]; auxiliary: string[];
  group: string; time: string; x: string; mediator: string; variance: string;
  model: string; estimator: 'MLR' | 'ML' | 'WLSMV'; ordered: string[];
  waves: string[]; times: number[]; slope: string; within: boolean;
  tau:number; lower:number; upper:number; basis:number;
  family: 'gaussian' | 'binomial' | 'poisson'; seed: number; bootstrap: number; imputations: number; iterations: number;
}
export const defaultOpenSpec = (): OpenSpec => ({ tau:.5,lower:-.2,upper:.2,basis:10,workflow:'sem',outcome:'',predictors:[],auxiliary:[],group:'',time:'',x:'',mediator:'',variance:'',model:'',estimator:'MLR',ordered:[],waves:[],times:[],slope:'',within:false,family:'gaussian',seed:20261010,bootstrap:1000,imputations:20,iterations:20 });
export type TableCell = string | number | boolean | null;
export interface OpenResult {
  tables: Record<string, Record<string, TableCell>[]>; metrics: Record<string, TableCell>;
  used: number[]; excluded: number[]; warnings: string[]; messages: string[];
  versions: Record<string, string>; session: string[]; citations: string[];
}
export interface OpenRun { schema: 'toolsscope-open-run-1'; id: string; at: string; engine: string; datasetName: string; simulated: boolean; hash: string; spec: OpenSpec; mapping: {name:string;alias:string;type:string}[]; result: OpenResult; script: string; report: string }
export interface Prepared { specJSON: string; csv: string; script: string; package: string; mapping: OpenRun['mapping'] }
const missing = (v: unknown) => v == null || (typeof v === 'string' && !v.trim());
export function prepareOpen(dataset: Dataset, spec: OpenSpec): Prepared {
  const workflow = WORKFLOWS.find(w => w.id === spec.workflow);
  if (!workflow) throw Error('Unknown workflow.');
  if (dataset.rows.length < 5 || dataset.rows.length > 25000) throw Error('Use 5–25,000 rows in this browser workflow. Export to desktop R for larger studies.');
  if (new Set(dataset.variables.map(v=>v.name)).size !== dataset.variables.length) throw Error('Column names must be unique.');
  const mapping = dataset.variables.map((v,i)=>({name:v.name,alias:`v${i+1}`,type:v.type}));
  const aliases = new Map(mapping.map(v=>[v.name,v.alias]));
  const required: string[] = [];
  const numeric: string[] = [];
  const add = (name: string, number = true) => { if (!aliases.has(name)) throw Error('Choose all required variables.'); required.push(name); if(number) numeric.push(name); };
  if (['mixed','impute','panel'].includes(spec.workflow)) { add(spec.outcome); if(!spec.predictors.length) throw Error('Choose at least one predictor.'); spec.predictors.forEach(v=>add(v)); }
  if (['survival','quantile','gam','equivalence'].includes(spec.workflow)) add(spec.outcome);
  if (['survival','quantile'].includes(spec.workflow)) {if(!spec.predictors.length)throw Error('Choose at least one predictor.');spec.predictors.forEach(v=>add(v));}
  if (spec.workflow==='survival') add(spec.time);
  if (spec.workflow==='gam') {add(spec.x);spec.predictors.forEach(v=>add(v));if(!Number.isInteger(spec.basis)||spec.basis<4||spec.basis>30)throw Error('Choose an integer basis size from 4 to 30.');}
  if (spec.workflow==='quantile'&&(!Number.isFinite(spec.tau)||spec.tau<.05||spec.tau>.95))throw Error('Choose a quantile from .05 to .95.');
  if (spec.workflow==='equivalence') {add(spec.group,false);if(!Number.isFinite(spec.lower)||!Number.isFinite(spec.upper)||spec.lower>=0||spec.upper<=0)throw Error('Equivalence bounds must bracket zero in outcome units.');}
  if (spec.workflow==='mixed') { add(spec.group,false); if(spec.slope && !spec.predictors.includes(spec.slope)) throw Error('Random slope must be one of the fixed predictors.'); if(spec.within && !spec.slope) throw Error('Choose the predictor to decompose into within/between components.'); }
  if (spec.workflow==='panel') { add(spec.group,false); add(spec.time,false); }
  if (spec.workflow==='impute') spec.auxiliary.forEach(v=>add(v));
  if (spec.workflow==='meta') { add(spec.outcome); add(spec.variance); spec.predictors.forEach(v=>add(v)); }
  if (spec.workflow==='mediation') { add(spec.x); add(spec.mediator); add(spec.outcome); }
  if (spec.workflow==='growth') {
    if(spec.waves.length<3 || spec.waves.length>20 || spec.times.length!==spec.waves.length || spec.times.some(t=>!Number.isFinite(t)) || new Set(spec.times).size<3) throw Error('Select 3–20 ordered waves with matching, distinct finite observation times.');
    if(spec.times.some((t,i)=>i>0 && t<=spec.times[i-1])) throw Error('Wave times must increase in the selected order.');
    spec.waves.forEach(v=>add(v));
  }
  if (spec.workflow==='sem' || spec.workflow==='invariance') {
    if (!spec.model.trim() || spec.model.length>10000) throw Error('Supply a model using the displayed variable aliases.');
    if (!/^[\w\s.~:=+*()\-/]*$/.test(spec.model) || /\b[A-Za-z_]\w*\s*\(/.test(spec.model)) throw Error('Use lavaan relationships, numeric constants and arithmetic only; R function calls are not accepted.');
    if(spec.workflow==='invariance' && /:=|(^|\n)[^\n]*[^=~]~[^~=]/.test(spec.model)) throw Error('Invariance accepts a measurement model (=~ and ~~), not structural regressions or defined effects.');
    if(spec.workflow==='invariance') add(spec.group,false);
    if(spec.estimator==='WLSMV' && spec.workflow==='sem') { if(!spec.ordered.length) throw Error('Select the ordered indicators for WLSMV.'); spec.ordered.forEach(v=>add(v)); }
  }
  if(new Set(required).size!==required.length) throw Error('Assign distinct variables to different roles; do not repeat predictors or auxiliaries.');
  numeric.forEach(name=>dataset.rows.forEach((r,i)=>{ if(!missing(r[name]) && !Number.isFinite(Number(r[name]))) throw Error(`Row ${i+1}: ${name} is not finite numeric data.`); }));
  for (const [name,n,min,max] of [['seed',spec.seed,0,2147483646],['bootstrap',spec.bootstrap,100,10000],['imputations',spec.imputations,2,100],['iterations',spec.iterations,2,100]] as const) if(!Number.isInteger(n)||n<min||n>max) throw Error(`${name} must be an integer from ${min} to ${max}.`);
  const alias = (v: string) => v ? aliases.get(v) || '' : '';
  const mapped = { ...spec, outcome:alias(spec.outcome),predictors:spec.predictors.map(alias),auxiliary:spec.auxiliary.map(alias),group:alias(spec.group),time:alias(spec.time),x:alias(spec.x),mediator:alias(spec.mediator),variance:alias(spec.variance),ordered:spec.ordered.map(alias),waves:spec.waves.map(alias),slope:alias(spec.slope),numeric:[...new Set([...numeric.map(alias),...mapping.filter(v=>['numeric','likert'].includes(v.type)).map(v=>v.alias)])], package:workflow.package };
  const quote = (v: unknown) => missing(v) ? '' : `"${String(v).replaceAll('"','""')}"`;
  const csv = mapping.map(v=>v.alias).join(',')+'\n'+dataset.rows.map(r=>mapping.map(v=>quote(r[v.name])).join(',')).join('\n');
  return { specJSON:JSON.stringify(mapped,null,2),csv,script:OPEN_R_SCRIPT,package:workflow.package,mapping };
}

// The same script is run in WebAssembly and downloaded for desktop R.
// User selections are JSON data, never interpolated executable R code.
export const OPEN_R_SCRIPT = String.raw`# ToolsScope open-r-1.0.0 — run from the extracted bundle directory.
# Install the packages named in spec.json plus jsonlite before running this file.
# Preserve versions.json and sessionInfo.txt; package upgrades can change results.
suppressPackageStartupMessages(library(jsonlite))
# WebAssembly has one R worker and no OS CPU probe. lavaan 0.6-21 validates
# CPU option bounds against detectCores(); NA otherwise breaks even serial fits.
# This is an environment shim, not a change to the estimator; desktop R is untouched.
cpu_fallback <- is.na(parallel::detectCores())
if(cpu_fallback) {
  ns <- asNamespace('parallel'); unlockBinding('detectCores',ns)
  assign('detectCores',function(all.tests=FALSE,logical=TRUE) 1L,envir=ns)
  lockBinding('detectCores',ns)
}
p <- fromJSON('spec.json')
stopifnot(p$package %in% c('lavaan','lme4','mice','metafor','fixest','survival','mgcv','quantreg','stats'))
if (!requireNamespace(p$package, quietly=TRUE)) stop('Required package is not installed: ', p$package)
set.seed(p$seed)
d <- read.csv('data.csv', check.names=FALSE, colClasses='character', na.strings='', strip.white=FALSE)
for (v in unlist(p$numeric)) {
  old <- d[[v]]; new <- suppressWarnings(as.numeric(old))
  if (any(!is.na(old) & (!is.finite(new)))) stop('Non-numeric or non-finite input in ',v)
  d[[v]] <- new
}
row_ids <- seq_len(nrow(d))
warnings <- messages <- character()
as_rows <- function(x) { x <- as.data.frame(x); rownames(x) <- NULL; x }
coef_rows <- function(b,se,low,high,pval=NULL) data.frame(term=names(b),estimate=as.numeric(b),se=as.numeric(se),low=as.numeric(low),high=as.numeric(high),p=if(is.null(pval)) NA_real_ else as.numeric(pval))
complete <- function(vars) {
  if(any(!vars %in% names(d))) stop('Unknown variable in model')
  ok <- complete.cases(d[,vars,drop=FALSE]); used <<- row_ids[ok]
  if(sum(ok)<5) stop('Fewer than five complete observations')
  d[ok,,drop=FALSE]
}
fit_table <- function(fit) {
  wanted <- c('npar','chisq','df','pvalue','cfi','tli','rmsea','srmr','cfi.robust','tli.robust','rmsea.robust','aic','bic')
  fm <- lavaan::fitMeasures(fit); keep <- intersect(wanted,names(fm))
  data.frame(measure=keep,value=as.numeric(fm[keep]))
}
check_lavaan <- function(fit) {
  if(!isTRUE(lavaan::lavInspect(fit,'converged'))) stop('lavaan did not converge; no successful result recorded')
  if(!isTRUE(lavaan::lavInspect(fit,'post.check'))) warning('lavaan admissibility check failed: inspect negative variances and covariance matrices')
}
run <- function() {
  tables <- list(); metrics <- list(); used <<- integer()
  if(p$workflow %in% c('sem','invariance','growth','mediation')) {
    if(p$workflow %in% c('sem','invariance')) {
      model <- p$model
      ov <- lavaan::lavNames(lavaan::lavaanify(model),'ov')
      if(any(!ov %in% names(d))) stop('Model contains observed variables not in the alias map: ',paste(setdiff(ov,names(d)),collapse=', '))
      if(any(!vapply(d[,ov,drop=FALSE],is.numeric,logical(1)))) stop('Observed SEM variables must have numeric types in the Data tab')
      if(p$workflow=='invariance') {
        ok <- !is.na(d[[p$group]]) & rowSums(!is.na(d[,ov,drop=FALSE]))>0
        dd <- d[ok,,drop=FALSE]; used <<- row_ids[ok]
        if(length(unique(dd[[p$group]]))<2) stop('At least two groups are required')
        fits <- list(
          configural=lavaan::cfa(model,data=dd,group=p$group,estimator='MLR',missing='fiml',meanstructure=TRUE),
          metric=lavaan::cfa(model,data=dd,group=p$group,estimator='MLR',missing='fiml',meanstructure=TRUE,group.equal='loadings'),
          scalar=lavaan::cfa(model,data=dd,group=p$group,estimator='MLR',missing='fiml',meanstructure=TRUE,group.equal=c('loadings','intercepts')))
        lapply(fits,check_lavaan)
        tables$fit <- do.call(rbind,lapply(names(fits),function(n) cbind(model=n,fit_table(fits[[n]]))))
        tables$comparisons <- cbind(model=rownames(lavaan::lavTestLRT(fits[[1]],fits[[2]],fits[[3]])),as.data.frame(lavaan::lavTestLRT(fits[[1]],fits[[2]],fits[[3]])))
        tables$groups <- as.data.frame(table(dd[[p$group]])); names(tables$groups)<-c('group','n')
        tables$parameters <- lavaan::parameterEstimates(fits[[3]],standardized=TRUE,ci=TRUE)
        metrics$models <- 3; metrics$estimator <- 'MLR / FIML; continuous indicators'
        vals <- sapply(fits,function(f) lavaan::fitMeasures(f,c('cfi.robust','rmsea.robust','srmr')))
        tables$changes <- data.frame(comparison=c('metric minus configural','scalar minus metric'),deltaCFI=diff(vals[1,]),deltaRMSEA=diff(vals[2,]),deltaSRMR=diff(vals[3,]))
      } else {
        if(p$estimator=='WLSMV') {
          dd <- complete(ov)
          fit <- lavaan::sem(model,data=dd,ordered=unlist(p$ordered),estimator='WLSMV')
        } else {
          ok <- rowSums(!is.na(d[,ov,drop=FALSE]))>0; dd <- d[ok,,drop=FALSE]; used <<- row_ids[ok]
          fit <- lavaan::sem(model,data=dd,estimator=p$estimator,missing='fiml',fixed.x=FALSE,meanstructure=TRUE)
        }
        check_lavaan(fit); tables$fit<-fit_table(fit); tables$parameters<-lavaan::parameterEstimates(fit,standardized=TRUE,ci=TRUE)
        r2<-lavaan::lavInspect(fit,'r2'); tables$rSquared<-data.frame(variable=names(r2),rSquared=as.numeric(r2))
        metrics$estimator<-p$estimator
      }
    } else if(p$workflow=='growth') {
      waves<-unlist(p$waves); times<-unlist(p$times)
      ok<-rowSums(!is.na(d[,waves,drop=FALSE]))>0; dd<-d[ok,,drop=FALSE]; used<<-row_ids[ok]
      model<-paste('intercept =~',paste(paste0('1*',waves),collapse=' + '),'\nslope =~',paste(paste0(times,'*',waves),collapse=' + '))
      fit<-lavaan::growth(model,data=dd,estimator='MLR',missing='fiml')
      check_lavaan(fit); tables$fit<-fit_table(fit); tables$parameters<-lavaan::parameterEstimates(fit,standardized=TRUE,ci=TRUE)
      tables$trajectory<-data.frame(wave=waves,time=times,mean=vapply(dd[,waves,drop=FALSE],mean,numeric(1),na.rm=TRUE),n=vapply(dd[,waves,drop=FALSE],function(x)sum(!is.na(x)),integer(1)))
      metrics$model<-model
    } else {
      dd<-complete(c(p$x,p$mediator,p$outcome))
      model<-paste0(p$mediator,' ~ a*',p$x,'\n',p$outcome,' ~ b*',p$mediator,' + direct*',p$x,'\nindirect := a*b\ntotal := direct + a*b')
      fit<-lavaan::sem(model,data=dd,estimator='ML',se='bootstrap',bootstrap=p$bootstrap,fixed.x=FALSE)
      check_lavaan(fit); tables$parameters<-lavaan::parameterEstimates(fit,ci=TRUE,boot.ci.type='perc',standardized=TRUE)
      metrics$bootstrapRequested<-p$bootstrap; metrics$interval<-'Percentile bootstrap; independent rows'
    }
  } else if(p$workflow=='mixed') {
    preds<-unlist(p$predictors); dd<-complete(c(p$outcome,preds,p$group))
    if(length(unique(dd[[p$group]]))<3) stop('At least three independent groups required')
    if(length(unique(dd[[p$group]]))<30) warning('Few groups: assess finite-sample uncertainty and random-effects stability')
    slope<-p$slope
    if(p$within) {
      dd$within_component<-dd[[slope]]-ave(dd[[slope]],dd[[p$group]],FUN=mean)
      dd$between_component<-ave(dd[[slope]],dd[[p$group]],FUN=mean)
      preds<-c(setdiff(preds,slope),'within_component','between_component'); slope<-'within_component'
    }
    f<-as.formula(paste(p$outcome,'~',paste(preds,collapse=' + '),'+ (1',if(nchar(slope))paste('+',slope)else'', '|',p$group,')'))
    if(p$family=='gaussian') fit<-lme4::lmer(f,data=dd,REML=TRUE) else {
      yy<-dd[[p$outcome]]
      if(p$family=='binomial' && any(!yy %in% c(0,1))) stop('Binomial outcome must be coded 0/1')
      if(p$family=='poisson' && any(yy<0 | yy!=floor(yy))) stop('Poisson outcome must be nonnegative integer counts')
      fit<-lme4::glmer(f,data=dd,family=if(p$family=='binomial')binomial()else poisson(),control=lme4::glmerControl(optimizer='bobyqa'))
    }
    if(length(fit@optinfo$conv$lme4$messages)) warning(paste(fit@optinfo$conv$lme4$messages,collapse='; '))
    if(length(attr(lme4::getME(fit,'X'),'col.dropped'))) warning('Rank-deficient fixed-effects design: lme4 dropped columns')
    if(lme4::isSingular(fit)) warning('Singular random-effects fit: inspect variance estimates and the proposed structure')
    b<-lme4::fixef(fit); se<-sqrt(diag(as.matrix(vcov(fit)))); pv<-if(p$family=='gaussian')NULL else 2*pnorm(-abs(b/se))
    tables$coefficients<-coef_rows(b,se,b-1.95996398454*se,b+1.95996398454*se,pv)
    tables$randomEffects<-as.data.frame(lme4::VarCorr(fit)); tables$residuals<-data.frame(row=used,fitted=as.numeric(fitted(fit)),residual=as.numeric(residuals(fit)))
    metrics$groups<-length(unique(dd[[p$group]]));metrics$singular<-lme4::isSingular(fit);metrics$formula<-paste(deparse(f),collapse=' ');metrics$interval<-'Asymptotic normal Wald; Gaussian p values intentionally omitted'
  } else if(p$workflow=='impute') {
    vars<-c(p$outcome,unlist(p$predictors),unlist(p$auxiliary)); dd<-d[,vars,drop=FALSE]
    if(any(vapply(dd,function(x)sum(!is.na(x))<5,logical(1)))) stop('Each imputation variable needs at least five observed values')
    if(any(vapply(dd,function(x)length(unique(na.omit(x)))<2,logical(1)))) stop('Constant imputation variable')
    if(!anyNA(dd)) stop('No missing values in the selected imputation variables')
    used<<-row_ids; imp<-mice::mice(dd,m=p$imputations,maxit=p$iterations,method='pmm',seed=p$seed,printFlag=FALSE)
    f<-reformulate(unlist(p$predictors),response=p$outcome)
    models<-lapply(seq_len(p$imputations),function(i)lm(f,data=mice::complete(imp,i)))
    pooled<-mice::pool(mice::as.mira(models)); tables$pooled<-summary(pooled,conf.int=TRUE);tables$missingInformation<-pooled$pooled
    if(!is.null(imp$loggedEvents)) {tables$events<-imp$loggedEvents;warning('mice logged events; inspect exclusions/collinearity before reporting')}
    cm<-as.data.frame.table(imp$chainMean,responseName='mean'); names(cm)[1:3]<-c('variable','iteration','chain'); tables$chainMeans<-cm
    cv<-as.data.frame.table(imp$chainVar,responseName='variance');names(cv)[1:3]<-c('variable','iteration','chain');tables$chainVariances<-cv
    cc<-complete.cases(dd[,c(p$outcome,unlist(p$predictors)),drop=FALSE]); metrics$completeCases<-sum(cc)
    if(sum(cc)>length(p$predictors)+2) { m<-lm(f,data=dd[cc,,drop=FALSE]); co<-coef(summary(m));ci<-confint(m);tables$completeCase<-coef_rows(co[,1],co[,2],ci[,1],ci[,2],co[,4]) }
    metrics$imputations<-p$imputations;metrics$iterations<-p$iterations;metrics$missingCells<-sum(is.na(dd))
  } else if(p$workflow=='meta') {
    preds<-unlist(p$predictors);dd<-complete(c(p$outcome,p$variance,preds))
    if(any(dd[[p$variance]]<=0)) stop('Sampling variances must be strictly positive')
    if(nrow(dd)<=length(preds)+2) stop('Insufficient independent studies for this model')
    if(length(preds)) fit<-metafor::rma.uni(yi=dd[[p$outcome]],vi=dd[[p$variance]],mods=reformulate(preds),data=dd,method='REML',test='knha') else fit<-metafor::rma.uni(yi=dd[[p$outcome]],vi=dd[[p$variance]],method='REML',test='knha')
    b<-as.numeric(coef(fit));names(b)<-rownames(fit$b)
    tables$coefficients<-coef_rows(b,fit$se,fit$ci.lb,fit$ci.ub,fit$pval)
    tables$studies<-data.frame(row=used,estimate=dd[[p$outcome]],se=sqrt(dd[[p$variance]]),low=dd[[p$outcome]]-1.95996398454*sqrt(dd[[p$variance]]),high=dd[[p$outcome]]+1.95996398454*sqrt(dd[[p$variance]]))
    metrics$tauSquared<-fit$tau2;metrics$I2<-fit$I2;metrics$Q<-fit$QE;metrics$Qp<-fit$QEp;metrics$k<-fit$k
    if(!length(preds)) { tables$prediction<-as.data.frame(predict(fit));tables$leaveOneOut<-as.data.frame(metafor::leave1out(fit)) }

  } else if(p$workflow=='survival') {
    dd<-complete(c(p$outcome,p$time,unlist(p$predictors)))
    if(any(dd[[p$time]]<=0)||any(!dd[[p$outcome]] %in% c(0,1)))stop('Positive time and 0/1 event indicators are required')
    if(sum(dd[[p$outcome]])<5)stop('At least five observed events are required; this is not an adequacy guarantee')
    f<-as.formula(paste('survival::Surv(',p$time,',',p$outcome,') ~',paste(unlist(p$predictors),collapse=' + ')))
    fit<-survival::coxph(f,data=dd,x=TRUE,ties='efron'); co<-summary(fit)$coefficients; ci<-confint(fit)
    tables$coefficients<-coef_rows(setNames(co[,1],rownames(co)),co[,3],ci[,1],ci[,2],co[,5])
    tables$hazardRatios<-data.frame(term=rownames(co),HR=exp(co[,1]),low=exp(ci[,1]),high=exp(ci[,2]))
    ph<-survival::cox.zph(fit);tables$proportionalHazards<-data.frame(term=rownames(ph$table),ph$table,check.names=FALSE)
    km<-survival::survfit(as.formula(paste('survival::Surv(',p$time,',',p$outcome,') ~ 1')),data=dd)
    tables$survival<-data.frame(time=km$time,survival=km$surv,low=km$lower,high=km$upper,atRisk=km$n.risk,events=km$n.event)
    metrics$events<-sum(dd[[p$outcome]]);metrics$censored<-sum(dd[[p$outcome]]==0);metrics$PHglobalP<-ph$table[nrow(ph$table),3]
    if(metrics$PHglobalP<.05)warning('Global proportional-hazards test p < .05; investigate the PH assumption')
  } else if(p$workflow=='gam') {
    dd<-complete(c(p$outcome,p$x,unlist(p$predictors)))
    if(length(unique(dd[[p$x]]))<p$basis)stop('Smooth predictor has fewer unique values than the chosen basis size')
    s<-mgcv::s
    f<-as.formula(paste(p$outcome,'~ s(',p$x,', k=',p$basis,')',if(length(p$predictors))paste('+',paste(unlist(p$predictors),collapse=' + '))else''))
    fit<-mgcv::gam(f,data=dd,method='REML'); sm<-summary(fit)
    if(!isTRUE(fit$converged))stop('GAM did not converge')
    tables$smooth<-data.frame(term=rownames(sm$s.table),sm$s.table,check.names=FALSE)
    co<-sm$p.table;tables$coefficients<-coef_rows(setNames(co[,1],rownames(co)),co[,2],co[,1]-1.95996398454*co[,2],co[,1]+1.95996398454*co[,2],co[,4])
    grid<-data.frame(matrix(nrow=100,ncol=0));grid[[p$x]]<-seq(min(dd[[p$x]]),max(dd[[p$x]]),length.out=100)
    for(v in unlist(p$predictors))grid[[v]]<-median(dd[[v]])
    pr<-predict(fit,newdata=grid,se.fit=TRUE)
    tables$curve<-data.frame(x=grid[[p$x]],estimate=as.numeric(pr$fit),low=as.numeric(pr$fit-1.95996398454*pr$se.fit),high=as.numeric(pr$fit+1.95996398454*pr$se.fit))
    kc<-mgcv::k.check(fit);tables$basisCheck<-data.frame(term=rownames(kc),kc,check.names=FALSE)
    tables$residuals<-data.frame(row=used,fitted=as.numeric(fitted(fit)),residual=as.numeric(residuals(fit)))
    metrics$devianceExplained<-sm$dev.expl;metrics$R2<-sm$r.sq;metrics$interval<-'Pointwise mean CI, linear covariates held at medians'
  } else if(p$workflow=='quantile') {
    dd<-complete(c(p$outcome,unlist(p$predictors)));f<-reformulate(unlist(p$predictors),response=p$outcome)
    fit<-quantreg::rq(f,tau=p$tau,data=dd);co<-summary(fit,se='boot',R=p$bootstrap,bsmethod='xy')$coefficients
    tables$coefficients<-coef_rows(setNames(co[,1],rownames(co)),co[,2],co[,1]-1.95996398454*co[,2],co[,1]+1.95996398454*co[,2],NULL)
    tables$quantiles<-do.call(rbind,lapply(c(.25,.5,.75),function(t){b<-coef(quantreg::rq(f,tau=t,data=dd));data.frame(tau=t,term=names(b),estimate=as.numeric(b))}))
    metrics$tau<-p$tau;metrics$bootstrap<-p$bootstrap;metrics$interval<-'Pairs bootstrap SE with normal-Wald 95% CI; p values omitted'
  } else if(p$workflow=='equivalence') {
    dd<-complete(c(p$outcome,p$group));g<-sort(unique(as.character(dd[[p$group]])))
    if(length(g)!=2)stop('Exactly two independent groups required')
    a<-dd[[p$outcome]][as.character(dd[[p$group]])==g[1]];b<-dd[[p$outcome]][as.character(dd[[p$group]])==g[2]]
    if(min(length(a),length(b))<2)stop('Each group requires at least two observations')
    va<-var(a)/length(a);vb<-var(b)/length(b);se<-sqrt(va+vb)
    if(!is.finite(se)||se<=0)stop('Positive finite standard error required')
    df<-(va+vb)^2/(va^2/(length(a)-1)+vb^2/(length(b)-1));delta<-mean(a)-mean(b)
    pl<-pt((delta-p$lower)/se,df,lower.tail=FALSE);pu<-pt((delta-p$upper)/se,df)
    tables$coefficients<-coef_rows(setNames(delta,paste(g[1],'-',g[2])),se,delta-qt(.975,df)*se,delta+qt(.975,df)*se)
    tables$equivalence<-data.frame(difference=delta,low90=delta-qt(.95,df)*se,high90=delta+qt(.95,df)*se,lowerBound=p$lower,upperBound=p$upper,pLower=pl,pUpper=pu,equivalent=max(pl,pu)<.05)
    tables$groups<-data.frame(group=g,n=c(length(a),length(b)),mean=c(mean(a),mean(b)),sd=c(sd(a),sd(b)))
    metrics$df<-df;metrics$TOSTp<-max(pl,pu);metrics$equivalent<-max(pl,pu)<.05;metrics$direction<-paste(g[1],'-',g[2]);metrics$alpha<-.05
  } else if(p$workflow=='panel') {
    preds<-unlist(p$predictors);dd<-complete(c(p$outcome,preds,p$group,p$time))
    if(anyDuplicated(dd[,c(p$group,p$time),drop=FALSE])) stop('Duplicate unit/time rows; resolve the panel structure first')
    if(length(unique(dd[[p$group]]))<3 || length(unique(dd[[p$time]]))<2) stop('Need at least three units and two time periods')
    f<-as.formula(paste(p$outcome,'~',paste(preds,collapse=' + '),'|',p$group,'+',p$time))
    fit<-fixest::feols(f,data=dd,vcov=as.formula(paste('~',p$group)),notes=TRUE)
    co<-fixest::coeftable(fit);ci<-confint(fit)
    tables$coefficients<-coef_rows(setNames(co[,1],rownames(co)),co[,2],ci[,1],ci[,2],co[,4])
    if(length(fit$collin.var)) warning('Collinear variables removed: ',paste(fit$collin.var,collapse=', '))
    selected<-fixest::obs(fit); used<<-used[selected]
    metrics$n<-nobs(fit);metrics$withinR2<-as.numeric(fixest::fitstat(fit,'wr2')[[1]]);metrics$clusters<-length(unique(dd[[p$group]][selected]));metrics$formula<-paste(deparse(f),collapse=' ')
  }
  tables<-lapply(tables,as_rows)
  metrics$includedRows<-length(used);metrics$excludedRows<-nrow(d)-length(used);metrics$seed<-p$seed
  list(tables=tables,metrics=metrics,used=unname(used),excluded=unname(setdiff(row_ids,used)))
}
result <- withCallingHandlers(run(),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart('muffleWarning')},message=function(m){messages<<-c(messages,conditionMessage(m));invokeRestart('muffleMessage')})
result$warnings<-unique(warnings);result$messages<-unique(messages)
if(cpu_fallback) result$messages<-c(result$messages,'WebAssembly CPU discovery fallback: one serial R worker')
pkgs<-sort(unique(c('jsonlite',p$package,loadedNamespaces())))
result$versions<-as.list(setNames(vapply(pkgs,function(x)as.character(packageVersion(x)),character(1)),pkgs))
result$versions$R<-as.character(getRversion())
result$session<-capture.output(sessionInfo())
result$citations<-capture.output(print(citation(p$package)))
write_json(result,'results.json',auto_unbox=TRUE,dataframe='rows',null='null',na='null',digits=NA,pretty=TRUE)
writeLines(result$session,'sessionInfo.txt')
`;

export function openReport(run: Omit<OpenRun,'report'>): string {
  const workflow=WORKFLOWS.find(w=>w.id===run.spec.workflow)!;
  const safe=(v:unknown)=>String(v??'—').replaceAll('|','\\|').replaceAll('\n',' ');
  let text=`# ${workflow.name}\n\nActual ${workflow.package} output · ${run.at}\n\nDataset: ${run.datasetName}${run.simulated?' (SIMULATED)':''}\nSHA-256: ${run.hash}\nRun: ${run.id}\n\n## Method boundary\n\n${workflow.limits}\n\n## Settings\n\n\`\`\`json\n${JSON.stringify(run.spec,null,2)}\n\`\`\`\n\n## Variable aliases\n\n${run.mapping.map(v=>`- ${v.alias}: ${v.name}`).join('\n')}\n\n## Results\n`;
  for(const [name,rows] of Object.entries(run.result.tables)){ if(!rows.length)continue;const keys=Object.keys(rows[0]);text+=`\n### ${name}\n\n| ${keys.map(safe).join(' | ')} |\n| ${keys.map(()=>'---').join(' | ')} |\n${rows.map(row=>`| ${keys.map(k=>safe(row[k])).join(' | ')} |`).join('\n')}\n`; }
  return text+`\n## Diagnostics\n\n${JSON.stringify(run.result.metrics,null,2)}\n\n${run.result.warnings.concat(run.result.messages).map(w=>`- ${w}`).join('\n')||'No engine warnings recorded; this does not certify model validity.'}\n\n## Excluded rows\n\n${run.result.excluded.join(', ')||'None'}\n\n## Software citation (returned by the installed package)\n\n${run.result.citations.join('\n')}\n\n## Session\n\n\`\`\`\n${run.result.session.join('\n')}\n\`\`\`\n`;
}

let engine: import('webr').WebR | null=null;
let initialization: Promise<import('webr').WebR> | null=null;
let generation=0;
export function resetOpenEngine() { generation++;engine?.close();engine=null;initialization=null; }
export async function getOpenEngine(status:(s:string)=>void=()=>{}) {
  if(!initialization) {
    const token=generation;
    initialization=(async()=>{status('Downloading R WebAssembly runtime…');const {WebR,ChannelType}=await import('webr');if(token!==generation)throw Error('Run cancelled.');const instance=new WebR({baseUrl:'https://webr.r-wasm.org/v0.6.0/',channelType:ChannelType.PostMessage,interactive:false});engine=instance;await instance.init();if(token!==generation){instance.close();throw Error('Run cancelled.');}return instance;})().catch(e=>{if(token===generation){initialization=null;engine?.close();engine=null;}throw e;});
  }
  return initialization;
}
export async function executeOpen(dataset:Dataset,spec:OpenSpec,status:(s:string)=>void):Promise<OpenRun> {
  const prepared=prepareOpen(dataset,spec), runGeneration=generation;
  const r=await getOpenEngine(status);
  status(`Loading ${prepared.package} and its dependencies…`);
  await r.installPackages(prepared.package==='stats'?['jsonlite']:['jsonlite',prepared.package],{quiet:true});
  if(runGeneration!==generation) throw Error('Run cancelled.');
  await r.FS.writeFile('data.csv',new TextEncoder().encode(prepared.csv));
  await r.FS.writeFile('spec.json',new TextEncoder().encode(prepared.specJSON));
  status(`Running ${prepared.package} on ${dataset.rows.length} rows…`);
  const shelter=await new r.Shelter();
  try {
    await shelter.captureR(prepared.script,{captureGraphics:false});
    if(runGeneration!==generation) throw Error('Run cancelled.');
    const result=JSON.parse(new TextDecoder().decode(await r.FS.readFile('results.json'))) as OpenResult;
    // jsonlite auto_unbox applies to scalar metrics, but arrays remain vectors.
    for(const key of ['warnings','messages','session','citations','used','excluded'] as const) if(!Array.isArray(result[key])) (result as unknown as Record<string,unknown>)[key]=result[key]==null?[]:[result[key]];
    const run={schema:'toolsscope-open-run-1' as const,id:crypto.randomUUID(),at:new Date().toISOString(),engine:OPEN_ENGINE_VERSION,datasetName:dataset.name,simulated:dataset.source==='demo',hash:await fingerprint(dataset),spec:structuredClone(spec),mapping:prepared.mapping,result,script:prepared.script};
    return {...run,report:openReport(run)};
  } finally { if(runGeneration===generation) await shelter.purge(); }
}
